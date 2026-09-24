import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    company: { findFirst: vi.fn(), create: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { defaultCompanyId } from '@/lib/company';

describe('defaultCompanyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the oldest company of the organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue({ id: 'c1' });
    await expect(defaultCompanyId('org-1')).resolves.toBe('c1');
    expect(mockPrisma.company.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' }, orderBy: { createdAt: 'asc' } }),
    );
    expect(mockPrisma.company.create).not.toHaveBeenCalled();
  });

  it('creates one named after the organization when it has none', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue({ name: 'Acme' });
    mockPrisma.company.create.mockResolvedValue({ id: 'c2' });
    await expect(defaultCompanyId('org-1')).resolves.toBe('c2');
    expect(mockPrisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { organizationId: 'org-1', name: 'Acme' } }),
    );
  });

  it('uses the company another request created at the same time', async () => {
    mockPrisma.company.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'c3' });
    mockPrisma.organization.findUnique.mockResolvedValue({ name: 'Acme' });
    mockPrisma.company.create.mockRejectedValue(new Error('unique'));
    await expect(defaultCompanyId('org-1')).resolves.toBe('c3');
  });

  it('fails for an organization that does not exist', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    await expect(defaultCompanyId('nope')).rejects.toThrow(/no encontrada/);
  });
});
