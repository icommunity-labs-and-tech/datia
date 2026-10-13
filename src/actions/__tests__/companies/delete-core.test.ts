import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Deleting a company (#138) is not one cascade: `Company -> User.companyId`
 * is SET NULL in the real schema, not CASCADE (checked against production,
 * not schema.prisma), so a plain `company.delete()` would leave its accounts
 * alive and orphaned. And two of those accounts' own relations are RESTRICT
 * (`Notification.userId`, `ImportJob.uploadedBy`) — deleting the accounts
 * first without clearing those would throw. This is what the transaction
 * here must get right, in order.
 */

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    user: { findMany: vi.fn(async () => [{ id: 'u-1' }, { id: 'u-2' }]), deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    importJob: { deleteMany: vi.fn() },
    company: { delete: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      company: { findFirst: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { deleteCompanyCore } from '@/actions/companies/delete-core';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.company.findFirst.mockResolvedValue({ id: 'co-1', organizationId: 'org-1' });
  tx.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
});

describe('deleteCompanyCore', () => {
  it('deletes the RESTRICT dependents of its accounts before the accounts, then the company', async () => {
    const result = await deleteCompanyCore('co-1');

    expect(result).toEqual({ success: true });
    expect(tx.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ['u-1', 'u-2'] } } });
    expect(tx.importJob.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ uploadedBy: { in: ['u-1', 'u-2'] } }, { executedBy: { in: ['u-1', 'u-2'] } }] },
    });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['u-1', 'u-2'] } } });
    expect(tx.company.delete).toHaveBeenCalledWith({ where: { id: 'co-1' } });

    // Order matters: the RESTRICT dependents must go before the accounts.
    const notifOrder = tx.notification.deleteMany.mock.invocationCallOrder[0];
    const importJobOrder = tx.importJob.deleteMany.mock.invocationCallOrder[0];
    const userOrder = tx.user.deleteMany.mock.invocationCallOrder[0];
    const companyOrder = tx.company.delete.mock.invocationCallOrder[0];
    expect(notifOrder).toBeLessThan(userOrder);
    expect(importJobOrder).toBeLessThan(userOrder);
    expect(userOrder).toBeLessThan(companyOrder);
  });

  it('skips the account cleanup entirely for a company with none', async () => {
    tx.user.findMany.mockResolvedValue([]);
    await deleteCompanyCore('co-1');

    expect(tx.notification.deleteMany).not.toHaveBeenCalled();
    expect(tx.importJob.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
    expect(tx.company.delete).toHaveBeenCalledWith({ where: { id: 'co-1' } });
  });

  it('scopes to the given organization, so another organization\'s company id matches nothing', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    const result = await deleteCompanyCore('co-ajena', 'org-1');

    expect(result).toEqual({ success: false, error: 'Empresa no encontrada' });
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ id: 'co-ajena', organizationId: 'org-1' });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('is not scoped at all when no organization is given, for the superadmin', async () => {
    await deleteCompanyCore('co-1');
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ id: 'co-1' });
  });
});
