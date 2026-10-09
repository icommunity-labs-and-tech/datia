import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * What the organization's own Consumo/Emisiones pages show: the same views a
 * company has, summed across every company it operates — a scope with no
 * `companyId` (#20), not one company's.
 */

const {
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

import { getOrganizationEnergy, getOrganizationEnergyForecast } from '@/actions/organizations/get-organization-energy';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' });
  mockListSources.mockResolvedValue({ data: [] });
  mockListConsumption.mockResolvedValue({ data: [] });
  mockGetConsumptionTotals.mockResolvedValue({ records: 0, totalKwh: 0, monthly: [] });
  mockListEmissions.mockResolvedValue({ data: [] });
  mockGetEmissionTotals.mockResolvedValue({ records: 0, verified: 0, totalCo2eKg: 0, monthly: [] });
  mockForecastEnergy.mockResolvedValue({ horizonMonths: 6, baseMonth: null, sources: [], totalConsumption: [], totalEmissions: [], excludedSources: 0 });
  mockConsumptionHeatmap.mockResolvedValue({ months: [], rows: [], max: 0 });
  mockEmissionsHeatmap.mockResolvedValue({ months: [], rows: [], max: 0 });
});

describe('getOrganizationEnergy', () => {
  it('scopes every read to the whole organization, not one company', async () => {
    await getOrganizationEnergy();

    const scope = { organizationId: 'org-1', companyId: null };
    expect(mockListSources).toHaveBeenCalledWith(scope);
    expect(mockListConsumption).toHaveBeenCalledWith(scope);
    expect(mockGetConsumptionTotals).toHaveBeenCalledWith(scope);
    expect(mockListEmissions).toHaveBeenCalledWith(scope);
    expect(mockGetEmissionTotals).toHaveBeenCalledWith(scope);
    expect(mockForecastEnergy).toHaveBeenCalledWith(scope, 6);
    expect(mockConsumptionHeatmap).toHaveBeenCalledWith(scope);
    expect(mockEmissionsHeatmap).toHaveBeenCalledWith(scope);
  });

  it('refuses a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(getOrganizationEnergy()).rejects.toThrow();
  });
});

describe('getOrganizationEnergyForecast', () => {
  it('forecasts the whole organization at the requested horizon', async () => {
    await getOrganizationEnergyForecast(12);
    expect(mockForecastEnergy).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null }, 12);
  });

  it('refuses a session that is not the organization account', async () => {
    mockVerify.mockResolvedValue(null);
    await expect(getOrganizationEnergyForecast(6)).rejects.toThrow();
  });
});
