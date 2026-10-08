import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The organization account's home sums what each of its companies holds. A
 * scope with no company covers the whole organization (#20), so every query
 * here uses that scope instead of one company's.
 */

const { mockPrisma, mockVerify, mockCountAssets, mockCertCounts } = vi.hoisted(() => ({
  mockPrisma: {
    company: { findMany: vi.fn() },
    user: { groupBy: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockCountAssets: vi.fn(),
  mockCertCounts: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/infrastructure/prisma/repositories/AssetRepositoryPrisma', () => ({
  assetRepository: { countTotalItems: mockCountAssets },
}));
vi.mock('@/lib/certification/queries', () => ({ certificationCounts: mockCertCounts }));

import { getOrganizationOverview } from '@/actions/organizations/get-overview';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockPrisma.company.findMany.mockResolvedValue([
    { id: 'co-1', name: 'Norte', active: true, createdAt: new Date('2026-09-01'), _count: { Asset: 3, User: 2 } },
    { id: 'co-2', name: 'Sur', active: false, createdAt: new Date('2026-09-02'), _count: { Asset: 1, User: 1 } },
  ]);
  mockPrisma.user.groupBy.mockResolvedValue([
    { status: 'ACTIVE', _count: { id: 2 } },
    { status: 'PENDING', _count: { id: 1 } },
  ]);
  mockCountAssets.mockResolvedValue(4);
  mockCertCounts.mockResolvedValue({ total: 5, certified: 3, issued: 2, thisMonth: 1 });
});

describe('getOrganizationOverview', () => {
  it('sums across every company of the organisation', async () => {
    const result = await getOrganizationOverview();

    expect(result.companiesCount).toBe(2);
    expect(result.activeCompaniesCount).toBe(1);
    expect(result.totalAssets).toBe(4);
    expect(result.totalCertifications).toBe(5);
    expect(result.certifiedCertifications).toBe(3);
    expect(result.activeAccountsCount).toBe(2);
    expect(result.pendingAccountsCount).toBe(1);
  });

  it('scopes every query to the whole organisation, not one company', async () => {
    await getOrganizationOverview();

    expect(mockCountAssets).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null });
    expect(mockCertCounts).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null });
    expect(mockPrisma.user.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1', companyId: { not: null } } })
    );
  });

  it('counts no account twice: the organisation account itself has no company and is excluded', async () => {
    await getOrganizationOverview();

    const where = mockPrisma.user.groupBy.mock.calls[0][0].where;
    expect(where.companyId).toEqual({ not: null });
  });

  it('refuses a session that is not the organisation account', async () => {
    mockVerify.mockResolvedValue(null);

    await expect(getOrganizationOverview()).rejects.toThrow();
  });
});
