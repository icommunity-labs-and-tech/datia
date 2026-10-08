import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * What the organization panel's read-only company view shows about one
 * company's energy and carbon — scoped to the company in the address, never
 * to whatever the caller's own session happens to be (#20).
 */

const {
  mockPrisma,
  mockVerify,
  mockListSources,
  mockListConsumption,
  mockGetConsumptionTotals,
  mockListEmissions,
  mockGetEmissionTotals,
  mockForecastEnergy,
  mockConsumptionHeatmap,
  mockEmissionsHeatmap,
} = vi.hoisted(() => ({
  mockPrisma: { company: { findFirst: vi.fn() } },
  mockVerify: vi.fn(),
  mockListSources: vi.fn(),
  mockListConsumption: vi.fn(),
  mockGetConsumptionTotals: vi.fn(),
  mockListEmissions: vi.fn(),
  mockGetEmissionTotals: vi.fn(),
  mockForecastEnergy: vi.fn(),
  mockConsumptionHeatmap: vi.fn(),
  mockEmissionsHeatmap: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'organization-auth-token' ? { value: 'tok' } : undefined) }),
}));
vi.mock('@/lib/auth/organization/jwt', () => ({ verifyOrganizationJWT: mockVerify }));
vi.mock('@/infrastructure/prisma/repositories/EnergyRepositoryPrisma', () => ({ energyRepository: {} }));
vi.mock('@/domain/energy/EnergyServiceImpl', () => ({
  createEnergyServiceImpl: () => ({
    listSources: mockListSources,
    listConsumption: mockListConsumption,
    getConsumptionTotals: mockGetConsumptionTotals,
    listEmissions: mockListEmissions,
    getEmissionTotals: mockGetEmissionTotals,
  }),
}));
vi.mock('@/lib/projections/energy-forecast', () => ({ forecastEnergy: mockForecastEnergy }));
vi.mock('@/lib/energy/heatmap', () => ({
  computeConsumptionHeatmap: mockConsumptionHeatmap,
  computeEmissionsHeatmap: mockEmissionsHeatmap,
}));

import { getCompanyEnergy, getCompanyEnergyForecast } from '@/actions/companies/get-company-energy';

const company = { id: 'co-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockPrisma.company.findFirst.mockResolvedValue(company);
  mockListSources.mockResolvedValue({ data: [] });
  mockListConsumption.mockResolvedValue({ data: [] });
  mockGetConsumptionTotals.mockResolvedValue({ records: 0, totalKwh: 0, monthly: [] });
  mockListEmissions.mockResolvedValue({ data: [] });
  mockGetEmissionTotals.mockResolvedValue({ records: 0, verified: 0, totalCo2eKg: 0, monthly: [] });
  mockForecastEnergy.mockResolvedValue({ horizonMonths: 6, baseMonth: null, sources: [], totalConsumption: [], totalEmissions: [], excludedSources: 0 });
  mockConsumptionHeatmap.mockResolvedValue({ months: [], rows: [], max: 0 });
  mockEmissionsHeatmap.mockResolvedValue({ months: [], rows: [], max: 0 });
});

describe('getCompanyEnergy', () => {
  it('scopes every read to the company in the address, not to the caller\'s own session', async () => {
    await getCompanyEnergy('co-1');

    const scope = { organizationId: 'org-1', companyId: 'co-1' };
    expect(mockListSources).toHaveBeenCalledWith(scope);
    expect(mockListConsumption).toHaveBeenCalledWith(scope);
    expect(mockGetConsumptionTotals).toHaveBeenCalledWith(scope);
    expect(mockListEmissions).toHaveBeenCalledWith(scope);
    expect(mockGetEmissionTotals).toHaveBeenCalledWith(scope);
    expect(mockForecastEnergy).toHaveBeenCalledWith(scope, 6);
    expect(mockConsumptionHeatmap).toHaveBeenCalledWith(scope);
    expect(mockEmissionsHeatmap).toHaveBeenCalledWith(scope);
  });

  it('checks the company belongs to this organization before reading anything', async () => {
    await getCompanyEnergy('co-1');
    expect(mockPrisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'co-1', organizationId: 'org-1' },
      select: { id: true },
    });
  });

  it('returns null, not an error, for a company of another organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    const result = await getCompanyEnergy('co-other-org');
    expect(result).toBeNull();
  });

  it('returns null for a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    const result = await getCompanyEnergy('co-1');
    expect(result).toBeNull();
  });
});

describe('getCompanyEnergyForecast', () => {
  it('forecasts the company in the address at the requested horizon', async () => {
    await getCompanyEnergyForecast('co-1', 12);
    expect(mockForecastEnergy).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: 'co-1' }, 12);
  });

  it('throws, rather than silently falling back, for a company of another organization', async () => {
    mockPrisma.company.findFirst.mockResolvedValue(null);
    await expect(getCompanyEnergyForecast('co-other-org', 6)).rejects.toThrow();
  });
});
