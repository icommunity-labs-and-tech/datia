import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The organization account reads one company at a time from its own panel. The
 * company comes from the address, so it is checked to be one of the
 * organization's before it becomes the scope of any read (#20).
 */

const { mockPrisma, mockVerify, mockAssets, mockUsers, mockCertified, mockCertifications } = vi.hoisted(() => ({
  mockPrisma: { company: { findFirst: vi.fn() } },
  mockVerify: vi.fn(),
  mockAssets: vi.fn(),
  mockUsers: vi.fn(),
  mockCertified: vi.fn(),
  mockCertifications: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/infrastructure/prisma/repositories/AssetRepositoryPrisma', () => ({
  assetRepository: { listForExport: mockAssets },
}));
vi.mock('@/infrastructure/prisma/repositories/UserRepositoryPrisma', () => ({
  userRepository: { findByOrganization: mockUsers },
}));
vi.mock('@/lib/certification/queries', () => ({
  certifiedAssetIds: mockCertified,
  listCertifications: mockCertifications,
}));

import { getCompanyOverview } from '@/actions/companies/overview';

const company = { id: 'co-2', name: 'Norte', active: true, createdAt: new Date('2026-09-25') };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockPrisma.company.findFirst.mockResolvedValue(company);
  mockAssets.mockResolvedValue([
    { id: 'a-1', name: 'Turbina', siteName: 'Ariza', createdAt: new Date('2026-09-01') },
    { id: 'a-2', name: 'Panel', siteName: null, createdAt: new Date('2026-09-02') },
  ]);
  mockCertified.mockResolvedValue(new Set(['a-1']));
  mockCertifications.mockResolvedValue([{ id: 'c-1' }]);
  mockUsers.mockResolvedValue([{ id: 'u-1', name: 'Ana', email: 'ana@norte.test', createdAt: new Date('2026-09-03'), role: 'ADMIN' }]);
});

describe('getCompanyOverview', () => {
  it('reads what the company holds, with the company as the scope of every read', async () => {
    const overview = await getCompanyOverview('co-2');

    const scope = { organizationId: 'org-1', companyId: 'co-2' };
    expect(mockAssets).toHaveBeenCalledWith(scope, { fullPassport: false });
    expect(mockCertified).toHaveBeenCalledWith(scope);
    expect(mockCertifications).toHaveBeenCalledWith(scope);
    expect(mockUsers).toHaveBeenCalledWith(scope);

    expect(overview?.company).toEqual(company);
    expect(overview?.assets.map((a) => [a.id, a.certified])).toEqual([['a-1', true], ['a-2', false]]);
    expect(overview?.accounts).toEqual([
      { id: 'u-1', name: 'Ana', email: 'ana@norte.test', createdAt: new Date('2026-09-03') },
    ]);
  });

  it('looks the company up inside the organization of the session', async () => {
    await getCompanyOverview('co-2');
    expect(mockPrisma.company.findFirst.mock.calls[0][0].where).toEqual({ id: 'co-2', organizationId: 'org-1' });
  });

  it('reads nothing for a company of another organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);

    expect(await getCompanyOverview('co-ajena')).toBeNull();
    expect(mockAssets).not.toHaveBeenCalled();
    expect(mockUsers).not.toHaveBeenCalled();
    expect(mockCertifications).not.toHaveBeenCalled();
  });

  it('reads nothing without an organization session: a company account has none', async () => {
    mockVerify.mockResolvedValue(null);

    expect(await getCompanyOverview('co-2')).toBeNull();
    expect(mockPrisma.company.findFirst).not.toHaveBeenCalled();
    expect(mockAssets).not.toHaveBeenCalled();
  });
});
