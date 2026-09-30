import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireScope } from '@/lib/auth/tenant';
import { forecastEnergy } from '@/lib/projections/energy-forecast';
import { getEnergyForecast } from '../get-forecast';

const scope = { organizationId: 'org-1', companyId: 'co-1' };

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireScope: vi.fn(async () => scope) };
});

vi.mock('@/lib/projections/energy-forecast', () => ({
  forecastEnergy: vi.fn(async () => ({
    horizonMonths: 3,
    baseMonth: '2026-09',
    sources: [],
    totalConsumption: [],
    totalEmissions: [],
    excludedSources: 0,
  })),
}));

describe('getEnergyForecast', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forecasts over the session scope for a known horizon', async () => {
    await getEnergyForecast(6);
    expect(requireScope).toHaveBeenCalled();
    expect(forecastEnergy).toHaveBeenCalledWith(scope, 6);
  });

  it('rejects a horizon outside the offered ones', async () => {
    await expect(getEnergyForecast(4 as any)).rejects.toThrow(/no válido/);
    expect(forecastEnergy).not.toHaveBeenCalled();
  });
});
