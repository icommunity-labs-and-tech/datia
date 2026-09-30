import type { MonthlyPoint } from '@/domain/energy/EnergyTypes';

/** Below this many distinct months, a trend line is a guess dressed up as a forecast (#21). */
export const MIN_HISTORY_MONTHS = 6;

/** The 95% z-score for a prediction interval on the regression's residuals. */
const Z_95 = 1.96;

export interface ProjectedMonth {
  month: string;
  value: number;
  low: number;
  high: number;
}

export type TrendResult =
  | { status: 'insufficient-history'; historyMonths: number; points: [] }
  | { status: 'ok'; historyMonths: number; points: ProjectedMonth[] };

function monthIndex(month: string, firstMonth: string): number {
  const [y, m] = month.split('-').map(Number);
  const [y0, m0] = firstMonth.split('-').map(Number);
  return (y - y0) * 12 + (m - m0);
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const year = Math.floor(total / 12);
  const monthNum = (total % 12) + 1;
  return `${year}-${String(monthNum).padStart(2, '0')}`;
}

/**
 * Simple linear regression over a monthly series, with a 95% prediction
 * interval that widens the further a target month sits from the observed data
 * (#21). Physical quantities cannot be negative, so both value and the low
 * bound are clamped at 0.
 *
 * `targetMonths` need not follow directly after the history — evaluating the
 * fit further out just widens the interval, which is what lets sources with
 * stale data still compose into a scope-wide total anchored on the most
 * recent month across every source, not each source's own last point.
 */
export function projectTrend(history: MonthlyPoint[], targetMonths: string[]): TrendResult {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const historyMonths = sorted.length;

  if (historyMonths < MIN_HISTORY_MONTHS) {
    return { status: 'insufficient-history', historyMonths, points: [] };
  }

  const firstMonth = sorted[0].month;
  const xs = sorted.map((p) => monthIndex(p.month, firstMonth));
  const ys = sorted.map((p) => p.value);
  const n = xs.length;

  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;

  const sxx = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const sxy = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);

  // A flat or single-point-dominated series (sxx = 0) has no slope to fit —
  // fall back to the mean, with no interval narrower than the data's own spread.
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;

  const residuals = xs.map((x, i) => ys[i] - (intercept + slope * x));
  const ssr = residuals.reduce((s, r) => s + r ** 2, 0);
  // n=2 leaves no residual degrees of freedom; guard against dividing by 0.
  const residualStdError = n > 2 ? Math.sqrt(ssr / (n - 2)) : Math.sqrt(ssr / n);

  const points: ProjectedMonth[] = targetMonths.map((month) => {
    const x = monthIndex(month, firstMonth);
    const value = intercept + slope * x;
    const se = residualStdError * Math.sqrt(1 + 1 / n + (sxx === 0 ? 0 : (x - xMean) ** 2 / sxx));
    const margin = Z_95 * se;
    return {
      month,
      value: Math.max(0, value),
      low: Math.max(0, value - margin),
      high: Math.max(0, value + margin),
    };
  });

  return { status: 'ok', historyMonths, points };
}

/** The next `count` calendar months after `fromMonth` (exclusive). */
export function monthsAhead(fromMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(fromMonth, i + 1));
}
