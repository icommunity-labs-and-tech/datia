import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The organization's recent-assets list carries the company name on each row
 * — a company's own Inicio has no reason to, since every row is already its
 * own (#20).
 */

const { mockPrisma, mockVerify, mockCertifiedIds } = vi.hoisted(() => ({
  mockPrisma: {
    asset: { findMany: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockCertifiedIds: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/lib/certification/queries', () => ({ certifiedAssetIds: mockCertifiedIds }));

import { getRecentOrganizationAssets } from '@/actions/organizations/get-recent-assets';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockPrisma.asset.findMany.mockResolvedValue([
    { id: 'a-1', name: 'Turbina', createdAt: new Date('2026-10-05'), companyId: 'co-1', Company: { name: 'Norte' } },
    { id: 'a-2', name: 'Panel', createdAt: new Date('2026-10-04'), companyId: null, Company: null },
  ]);
  mockCertifiedIds.mockResolvedValue(new Set(['a-1']));
});

describe('getRecentOrganizationAssets', () => {
  it('carries the company name and id on each row', async () => {
    const rows = await getRecentOrganizationAssets();
    expect(rows[0]).toMatchObject({ id: 'a-1', companyId: 'co-1', companyName: 'Norte', certified: true });
    expect(rows[1]).toMatchObject({ id: 'a-2', companyId: null, companyName: null, certified: false });
  });

  it('scopes certification lookup to the whole organization', async () => {
    await getRecentOrganizationAssets();
    expect(mockCertifiedIds).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null });
  });

  it('queries across the organization, not one company', async () => {
    await getRecentOrganizationAssets();
    expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } })
    );
  });

  it('refuses a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(getRecentOrganizationAssets()).rejects.toThrow();
  });
});
