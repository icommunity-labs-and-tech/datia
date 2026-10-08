import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

/**
 * A row-by-month grid for comparing categories over time at a glance — which
 * source, or which GHG scope, is heaviest, and when.
 */
export interface HeatmapRow {
  label: string;
  /** Aligned with `months`; null where that cell has no reading. */
  values: (number | null)[];
}

export interface Heatmap {
  /** `YYYY-MM`, ascending. */
  months: string[];
  rows: HeatmapRow[];
  /** The largest cell value, for a shared color scale across every row. */
  max: number;
}

const MONTHS_SHOWN = 12;

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** Consumption by source, month by month: which source is heaviest, and when. */
export async function computeConsumptionHeatmap(scope: Scope): Promise<Heatmap> {
  const months = lastMonths(MONTHS_SHOWN);
  const series = await energyRepository.getSourceMonthlySeries(scope);

  let max = 0;
  const rows: HeatmapRow[] = series
    .filter((s) => s.monthly.some((m) => months.includes(m.month)))
    .map((s) => {
      const byMonth = new Map(s.monthly.map((m) => [m.month, m.value]));
      const values = months.map((m) => {
        const v = byMonth.get(m) ?? null;
        if (v != null && v > max) max = v;
        return v;
      });
      return { label: s.sourceName, values };
    });

  return { months, rows, max };
}

const GHG_SCOPES = ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'] as const;

/**
 * Emissions by GHG scope, month by month: where the carbon comes from, and
 * when. Keyed by the period the underlying consumption covers, the same
 * convention `computeCertificationTrend` uses — not by when the emission
 * record was calculated.
 */
export async function computeEmissionsHeatmap(scope: Scope): Promise<Heatmap> {
  const months = lastMonths(MONTHS_SHOWN);
  const rows = await prisma.emissionRecord.findMany({
    where: { EnergyConsumption: { EnergySource: { Asset: scopeWhere(scope) } } },
    select: { co2eKg: true, scope: true, EnergyConsumption: { select: { periodStart: true } } },
  });

  const grid = new Map<string, Map<string, number>>(GHG_SCOPES.map((s) => [s, new Map()]));
  for (const row of rows) {
    const byMonth = grid.get(row.scope);
    if (!byMonth) continue;
    const month = row.EnergyConsumption.periodStart.toISOString().slice(0, 7);
    if (!months.includes(month)) continue;
    byMonth.set(month, (byMonth.get(month) ?? 0) + row.co2eKg);
  }

  let max = 0;
  const heatRows: HeatmapRow[] = GHG_SCOPES.filter((s) => grid.get(s)!.size > 0).map((s) => {
    const byMonth = grid.get(s)!;
    const values = months.map((m) => {
      const v = byMonth.get(m) ?? null;
      if (v != null && v > max) max = v;
      return v;
    });
    return { label: s, values };
  });

  return { months, rows: heatRows, max };
}
