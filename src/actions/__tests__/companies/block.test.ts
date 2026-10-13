import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Blocking/unblocking (#138) reuses `Company.active`, scoped to the
 * organization account's own companies — it never touches another
 * organization's, even with its id guessed right.
 */

const { mockPrisma, mockVerify } = vi.hoisted(() => ({
  mockPrisma: { company: { update: vi.fn() } },
  mockVerify: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));

import { setCompanyBlocked } from '@/actions/companies/block';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
});

describe('setCompanyBlocked', () => {
  it('blocks one of its own companies', async () => {
    mockPrisma.company.update.mockResolvedValue({ id: 'co-1' });

    expect(await setCompanyBlocked('co-1', true)).toEqual({ success: true });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 'co-1', organizationId: 'org-1' },
      data: { active: false },
      select: { id: true },
    });
  });

  it('unblocks it back', async () => {
    mockPrisma.company.update.mockResolvedValue({ id: 'co-1' });

    await setCompanyBlocked('co-1', false);
    expect(mockPrisma.company.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: true } }));
  });

  it('is refused without an organization session', async () => {
    mockVerify.mockResolvedValue(null);
    expect(await setCompanyBlocked('co-1', true)).toMatchObject({ success: false });
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('fails instead of throwing for a company that is not its own', async () => {
    mockPrisma.company.update.mockRejectedValue(new Error('Record to update not found'));
    expect(await setCompanyBlocked('co-ajena', true)).toEqual({ success: false, error: 'Empresa no encontrada' });
  });
});
