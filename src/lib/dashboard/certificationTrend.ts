import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

/**
 * The series the home page is built around.
 *
 * The KPI tiles it replaces were figures without a question: «309 assets» does
 * not say whether that is good, rising or falling. What an organisation under
 * ESPR actually needs to see is how much energy and carbon it has accounted for
 * over time, and how much of it carries proof.
 *
 * Series are keyed by the period the reading covers, not by when it was
 * anchored: a record certified today about last March belongs to March. Keying
 * by anchoring date would pile a year of history onto whatever day the sweep ran.
 *
 * Scope-parameterized so both a company (`companyId` set) and an organization
 * (`companyId` null, every company summed) can read the same series.
 */

export interface CertificationTrendPoint {
  /** `YYYY-MM`. */
  month: string;
  kwh: number;
  co2eKg: number;
  /** Records whose proof is on chain. */
  certified: number;
  pending: number;
}

export interface ScopeSlice {
  scope: string;
  co2eKg: number;
  records: number;
}

export interface CertificationTrend {
  /** The window both the chart and the scope split cover, as `YYYY-MM`. */
  from: string;
  to: string;
  /** Closed months only: the one in progress would read as a collapse. */
  monthly: CertificationTrendPoint[];
  /** The month being written, reported apart so it is not mistaken for a trend. */
  currentMonth: CertificationTrendPoint | null;
  byScope: ScopeSlice[];
  /** Share of records carrying proof, 0–100. */
  coverage: number;
  totalRecords: number;
  /** Month-over-month change of the last closed month, as a percentage. */
  kwhChange: number | null;
  co2eChange: number | null;
}

const MONTHS_SHOWN = 12;

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

export async function computeCertificationTrend(scope: Scope): Promise<CertificationTrend> {
  const rows = await prisma.energyConsumption.findMany({
    where: { EnergySource: { Asset: scopeWhere(scope) } },
    select: {
      periodStart: true,
      consumptionKwh: true,
      EmissionRecord: { select: { co2eKg: true, scope: true, verificationStatus: true } },
    },
  });

  const buckets = new Map<string, CertificationTrendPoint>();
  let certified = 0;
  let total = 0;

  for (const row of rows) {
    const month = row.periodStart.toISOString().slice(0, 7);
    const point = buckets.get(month) ?? { month, kwh: 0, co2eKg: 0, certified: 0, pending: 0 };
    point.kwh += row.consumptionKwh;

    for (const emission of row.EmissionRecord) {
      point.co2eKg += emission.co2eKg;
      total++;
      if (emission.verificationStatus === 'VERIFIED') {
        point.certified++;
        certified++;
      } else {
        point.pending++;
      }
    }
    buckets.set(month, point);
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const rounded = [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({
      ...p,
      kwh: Math.round(p.kwh),
      co2eKg: parseFloat(p.co2eKg.toFixed(1)),
    }));

  // A month a few days old holds a few days of energy. Plotted next to closed
  // months it reads as a collapse, so it travels apart from the trend.
  const monthly = rounded.filter((p) => p.month < thisMonth).slice(-MONTHS_SHOWN);
  const currentMonth = rounded.find((p) => p.month === thisMonth) ?? null;

  const last = monthly.at(-1);
  const previous = monthly.at(-2);

  // The scope split covers the same window the chart does. Summing all history
  // beside a twelve-month chart put two different periods side by side without
  // saying so — the kind of figure that misleads without being false.
  const from = monthly[0]?.month ?? '';
  const scopes = new Map<string, ScopeSlice>();
  for (const row of rows) {
    const month = row.periodStart.toISOString().slice(0, 7);
    if (month < from || month >= thisMonth) continue;
    for (const emission of row.EmissionRecord) {
      const slice = scopes.get(emission.scope) ?? { scope: emission.scope, co2eKg: 0, records: 0 };
      slice.co2eKg += emission.co2eKg;
      slice.records++;
      scopes.set(emission.scope, slice);
    }
  }

  return {
    from,
    to: monthly.at(-1)?.month ?? '',
    monthly,
    currentMonth,
    byScope: [...scopes.values()]
      .map((s) => ({ ...s, co2eKg: parseFloat(s.co2eKg.toFixed(1)) }))
      .sort((a, b) => b.co2eKg - a.co2eKg),
    coverage: total ? parseFloat(((certified / total) * 100).toFixed(1)) : 0,
    totalRecords: total,
    kwhChange: last && previous ? percentChange(last.kwh, previous.kwh) : null,
    co2eChange: last && previous ? percentChange(last.co2eKg, previous.co2eKg) : null,
  };
}
