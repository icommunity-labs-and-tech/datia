import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

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

/**
 * Consumption by source, month by month: which source is heaviest, and when.
 *
 * Rows are labeled with the source's company too, but only for an
 * organization-wide scope (`companyId` null): the organization's own
 * Consumo page spans every company, and "Fuente para consumo" alone does not
 * say which one it belongs to — on a single company's own page that company
 * is already the page, so the prefix would only repeat it.
 */
export async function computeConsumptionHeatmap(scope: Scope): Promise<Heatmap> {
  const months = lastMonths(MONTHS_SHOWN);
  const rows = await prisma.energyConsumption.findMany({
    where: { EnergySource: { Asset: scopeWhere(scope) } },
    select: {
      periodStart: true,
      consumptionKwh: true,
      EnergySource: { select: { id: true, name: true, Asset: { select: { Company: { select: { name: true } } } } } },
    },
  });

  const bySource = new Map<string, { label: string; total: number; byMonth: Map<string, number> }>();
  for (const row of rows) {
    const month = row.periodStart.toISOString().slice(0, 7);
    if (!months.includes(month)) continue;

    const sourceId = row.EnergySource.id;
    const companyName = row.EnergySource.Asset?.Company?.name;
    const label = !scope.companyId && companyName ? `${companyName} · ${row.EnergySource.name}` : row.EnergySource.name;

    const entry = bySource.get(sourceId) ?? { label, total: 0, byMonth: new Map() };
    entry.total += row.consumptionKwh;
    entry.byMonth.set(month, (entry.byMonth.get(month) ?? 0) + row.consumptionKwh);
    bySource.set(sourceId, entry);
  }

  let max = 0;
  const heatRows: HeatmapRow[] = [...bySource.values()]
    .sort((a, b) => b.total - a.total)
    .map(({ label, byMonth }) => {
      const values = months.map((m) => {
        const v = byMonth.get(m) ?? null;
        if (v != null && v > max) max = v;
        return v;
      });
      return { label, values };
    });

  return { months, rows: heatRows, max };
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
