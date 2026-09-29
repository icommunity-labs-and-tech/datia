import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The superadmin explores any organization's companies (#19), read-only except
 * for activating/deactivating one. Everything here checks `isSuperAdmin()`
 * first and answers nothing/false for anyone else — a company account or an
 * organization account cannot use these actions on a company that is not
 * theirs, or at all.
 */

const { mockPrisma, mockIsSuperAdmin, mockAssets, mockUsers, mockCertified, mockCertifications, mockSources, mockConsumptionTotals, mockEmissionTotals } =
  vi.hoisted(() => ({
    mockPrisma: { company: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
    mockIsSuperAdmin: vi.fn(),
    mockAssets: vi.fn(),
    mockUsers: vi.fn(),
    mockCertified: vi.fn(),
    mockCertifications: vi.fn(),
    mockSources: vi.fn(),
    mockConsumptionTotals: vi.fn(),
    mockEmissionTotals: vi.fn(),
  }));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, isSuperAdmin: mockIsSuperAdmin };
});
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
vi.mock('@/infrastructure/prisma/repositories/EnergyRepositoryPrisma', () => ({
  energyRepository: {
    findSourcesByOrganization: mockSources,
    getConsumptionTotals: mockConsumptionTotals,
    getEmissionTotals: mockEmissionTotals,
  },
}));

import { listCompaniesForOrganization, getSuperadminCompanyOverview, setCompanyActive } from '@/actions/companies/superadmin';

const company = {
  id: 'co-2',
  name: 'Filial',
  active: true,
  createdAt: new Date('2026-09-29'),
  organizationId: 'org-9',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockResolvedValue(true);
  mockPrisma.company.findUnique.mockResolvedValue(company);
  mockAssets.mockResolvedValue([]);
  mockCertified.mockResolvedValue(new Set());
  mockCertifications.mockResolvedValue([]);
  mockUsers.mockResolvedValue([]);
  mockSources.mockResolvedValue({ data: [{ id: 's-1' }, { id: 's-2' }], nextCursor: null, hasNextPage: false });
  mockConsumptionTotals.mockResolvedValue({ records: 40, totalKwh: 1234, monthly: [] });
  mockEmissionTotals.mockResolvedValue({ records: 40, verified: 12, totalCo2eKg: 56, monthly: [] });
});

describe('listCompaniesForOrganization', () => {
  it('lists the companies of any organization for the superadmin', async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      { id: 'co-1', name: 'Filial', active: true, createdAt: new Date(), _count: { Asset: 3, User: 2 } },
    ]);

    const result = await listCompaniesForOrganization('org-9');

    expect(result).toEqual([{ id: 'co-1', name: 'Filial', active: true, createdAt: expect.any(Date), assets: 3, accounts: 2 }]);
    expect(mockPrisma.company.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-9' });
  });

  it('is refused to anyone but the superadmin', async () => {
    mockIsSuperAdmin.mockResolvedValue(false);
    expect(await listCompaniesForOrganization('org-9')).toEqual([]);
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });
});

describe('getSuperadminCompanyOverview', () => {
  it('reads a company of any organization, with its energy summary', async () => {
    const overview = await getSuperadminCompanyOverview('co-2');

    const scope = { organizationId: 'org-9', companyId: 'co-2' };
    expect(mockAssets).toHaveBeenCalledWith(scope, { fullPassport: false });
    expect(overview?.company).toEqual({ id: 'co-2', name: 'Filial', active: true, createdAt: company.createdAt });
    expect(overview?.energy).toEqual({
      sources: 2,
      consumption: { records: 40, totalKwh: 1234 },
      emissions: { records: 40, verified: 12, totalCo2eKg: 56 },
    });
  });

  it('does not check whether the company is "its own": the superadmin has none', async () => {
    await getSuperadminCompanyOverview('co-2');
    // No organization membership check anywhere — only the role check.
    expect(mockPrisma.company.findUnique.mock.calls[0][0].where).toEqual({ id: 'co-2' });
  });

  it('reads nothing for anyone but the superadmin', async () => {
    mockIsSuperAdmin.mockResolvedValue(false);
    expect(await getSuperadminCompanyOverview('co-2')).toBeNull();
    expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
  });

  it('reads nothing for a company that does not exist', async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    expect(await getSuperadminCompanyOverview('co-fantasma')).toBeNull();
    expect(mockAssets).not.toHaveBeenCalled();
  });
});

describe('setCompanyActive', () => {
  it('activates or deactivates a company', async () => {
    mockPrisma.company.update.mockResolvedValue({ id: 'co-2', organizationId: 'org-9' });

    expect(await setCompanyActive('co-2', false)).toEqual({ success: true });
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 'co-2' },
      data: { active: false },
      select: { id: true, organizationId: true },
    });
  });

  it('is refused to anyone but the superadmin', async () => {
    mockIsSuperAdmin.mockResolvedValue(false);
    expect(await setCompanyActive('co-2', false)).toEqual({ success: false });
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });

  it('answers failure for a company that does not exist, instead of throwing', async () => {
    mockPrisma.company.update.mockRejectedValue(new Error('Record to update not found'));
    expect(await setCompanyActive('co-fantasma', true)).toEqual({ success: false });
  });
});
