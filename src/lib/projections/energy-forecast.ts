import type { Scope } from '@/lib/scope';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { projectTrend, monthsAhead } from './trend';
import type { ProjectedMonth } from './trend';

export type ForecastHorizon = 3 | 6 | 12;

export interface SourceForecast {
  sourceId: string;
  sourceName: string;
  status: 'ok' | 'insufficient-history';
  historyMonths: number;
  consumption: ProjectedMonth[];
  emissions: ProjectedMonth[];
}

export interface EnergyForecast {
  horizonMonths: ForecastHorizon;
  /** Null when the scope has no consumption history at all. */
  baseMonth: string | null;
  sources: SourceForecast[];
  /** Summed over sources with enough history, one point per calendar month. */
  totalConsumption: ProjectedMonth[];
  /** Summed over sources with enough history AND a known emission factor. */
  totalEmissions: ProjectedMonth[];
  excludedSources: number;
}

const EMPTY: EnergyForecast = {
  horizonMonths: 3,
  baseMonth: null,
  sources: [],
  totalConsumption: [],
  totalEmissions: [],
  excludedSources: 0,
};

function sumByMonth(months: string[], series: ProjectedMonth[][]): ProjectedMonth[] {
  const byMonth = new Map<string, ProjectedMonth>();
  for (const points of series) {
    for (const point of points) {
      const acc = byMonth.get(point.month) ?? { month: point.month, value: 0, low: 0, high: 0 };
      byMonth.set(point.month, {
        month: point.month,
        value: acc.value + point.value,
        low: acc.low + point.low,
        high: acc.high + point.high,
      });
    }
  }
  // Nothing contributed at all — an all-zero series would read as "no
  // consumption predicted" instead of "nothing could be predicted" (#21).
  if (byMonth.size === 0) return [];
  return months.map((month) => byMonth.get(month) ?? { month, value: 0, low: 0, high: 0 });
}

/**
 * Projects a scope's energy consumption and emissions N months ahead (#21), by
 * projecting each source on its own and composing the totals from the sources
 * with enough history — never a single trend fit over the whole scope, so the
 * total always equals what its parts show.
 */
export async function forecastEnergy(scope: Scope, horizonMonths: ForecastHorizon): Promise<EnergyForecast> {
  const series = await energyRepository.getSourceMonthlySeries(scope);

  const everyMonth = series.flatMap((s) => s.monthly.map((m) => m.month)).sort();
  if (everyMonth.length === 0) {
    return { ...EMPTY, horizonMonths };
  }

  const baseMonth = everyMonth.at(-1)!;
  const targetMonths = monthsAhead(baseMonth, horizonMonths);

  const sources: SourceForecast[] = series.map((source) => {
    const consumption = projectTrend(source.monthly, targetMonths);
    if (consumption.status === 'insufficient-history') {
      return {
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        status: 'insufficient-history',
        historyMonths: consumption.historyMonths,
        consumption: [],
        emissions: [],
      };
    }

    const factor = source.currentEmissionFactor;
    const emissions =
      factor != null
        ? consumption.points.map((p) => ({
            month: p.month,
            value: p.value * factor,
            low: p.low * factor,
            high: p.high * factor,
          }))
        : [];

    return {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      status: 'ok',
      historyMonths: consumption.historyMonths,
      consumption: consumption.points,
      emissions,
    };
  });

  return {
    horizonMonths,
    baseMonth,
    sources,
    totalConsumption: sumByMonth(
      targetMonths,
      sources.map((s) => s.consumption)
    ),
    totalEmissions: sumByMonth(
      targetMonths,
      sources.map((s) => s.emissions)
    ),
    excludedSources: sources.filter((s) => s.status === 'insufficient-history').length,
  };
}
