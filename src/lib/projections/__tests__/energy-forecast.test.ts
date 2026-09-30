import { describe, it, expect, vi, beforeEach } from 'vitest';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { forecastEnergy } from '../energy-forecast';

vi.mock('@/infrastructure/prisma/repositories/EnergyRepositoryPrisma', () => ({
  energyRepository: { getSourceMonthlySeries: vi.fn(async () => []) },
}));

const getSourceMonthlySeries = energyRepository.getSourceMonthlySeries as ReturnType<typeof vi.fn>;
const scope = { organizationId: 'org-1', companyId: 'co-1' };

const monthly = (start: string, values: number[]) => {
  const [y0, m0] = start.split('-').map(Number);
  return values.map((value, i) => {
    const total = y0 * 12 + (m0 - 1) + i;
    return { month: `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`, value };
  });
};

describe('forecastEnergy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an empty forecast for a scope with no history at all', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([]);

    const result = await forecastEnergy(scope, 3);

    expect(result).toEqual({
      horizonMonths: 3,
      baseMonth: null,
      sources: [],
      totalConsumption: [],
      totalEmissions: [],
      excludedSources: 0,
    });
  });

  it('excludes a source with too little history from the totals, without crashing on it', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([
      { sourceId: 'src-short', sourceName: 'Corta', monthly: monthly('2026-01', [10, 11]), currentEmissionFactor: 0.2 },
      {
        sourceId: 'src-long',
        sourceName: 'Larga',
        monthly: monthly('2026-01', [10, 11, 9, 12, 10, 11]),
        currentEmissionFactor: 0.2,
      },
    ]);

    const result = await forecastEnergy(scope, 3);

    expect(result.baseMonth).toBe('2026-06');
    expect(result.excludedSources).toBe(1);
    expect(result.sources.find((s) => s.sourceId === 'src-short')?.status).toBe('insufficient-history');
    expect(result.sources.find((s) => s.sourceId === 'src-long')?.status).toBe('ok');
    // Only the long source contributes, so the total equals its own projection.
    const longSource = result.sources.find((s) => s.sourceId === 'src-long')!;
    expect(result.totalConsumption).toEqual(longSource.consumption);
  });

  it('sums two ok sources into one total, month by month', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([
      { sourceId: 'src-a', sourceName: 'A', monthly: monthly('2026-01', [100, 100, 100, 100, 100, 100]), currentEmissionFactor: null },
      { sourceId: 'src-b', sourceName: 'B', monthly: monthly('2026-01', [50, 50, 50, 50, 50, 50]), currentEmissionFactor: null },
    ]);

    const result = await forecastEnergy(scope, 3);

    expect(result.totalConsumption).toHaveLength(3);
    for (const point of result.totalConsumption) {
      expect(point.value).toBeCloseTo(150, 5);
    }
  });

  it('derives emissions from consumption times the current factor, per source', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([
      { sourceId: 'src-a', sourceName: 'A', monthly: monthly('2026-01', [100, 100, 100, 100, 100, 100]), currentEmissionFactor: 0.3 },
    ]);

    const result = await forecastEnergy(scope, 3);

    const source = result.sources[0];
    expect(source.emissions[0].value).toBeCloseTo(source.consumption[0].value * 0.3, 5);
    expect(result.totalEmissions[0].value).toBeCloseTo(source.emissions[0].value, 5);
  });

  it('leaves emissions empty for a source with no known factor, without dragging the total to zero for others', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([
      { sourceId: 'src-known', sourceName: 'Con factor', monthly: monthly('2026-01', [100, 100, 100, 100, 100, 100]), currentEmissionFactor: 0.3 },
      { sourceId: 'src-unknown', sourceName: 'Sin factor', monthly: monthly('2026-01', [50, 50, 50, 50, 50, 50]), currentEmissionFactor: null },
    ]);

    const result = await forecastEnergy(scope, 3);

    const known = result.sources.find((s) => s.sourceId === 'src-known')!;
    const unknown = result.sources.find((s) => s.sourceId === 'src-unknown')!;
    expect(unknown.emissions).toEqual([]);
    expect(result.totalEmissions[0].value).toBeCloseTo(known.emissions[0].value, 5);
  });

  it('anchors the target months on the latest month seen across every source, not just one', async () => {
    getSourceMonthlySeries.mockResolvedValueOnce([
      { sourceId: 'src-stale', sourceName: 'Rezagada', monthly: monthly('2025-01', [10, 11, 9, 12, 10, 11]), currentEmissionFactor: null },
      { sourceId: 'src-fresh', sourceName: 'Al día', monthly: monthly('2026-01', [10, 11, 9, 12, 10, 11]), currentEmissionFactor: null },
    ]);

    const result = await forecastEnergy(scope, 3);

    expect(result.baseMonth).toBe('2026-06');
    expect(result.totalConsumption.map((p) => p.month)).toEqual(['2026-07', '2026-08', '2026-09']);
  });
});
