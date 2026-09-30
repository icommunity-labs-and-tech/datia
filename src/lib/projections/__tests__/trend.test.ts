import { describe, it, expect } from 'vitest';
import { projectTrend, monthsAhead, MIN_HISTORY_MONTHS } from '../trend';

const series = (start: string, values: number[]) => {
  const [y0, m0] = start.split('-').map(Number);
  return values.map((value, i) => {
    const total = y0 * 12 + (m0 - 1) + i;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    return { month: `${year}-${String(month).padStart(2, '0')}`, value };
  });
};

describe('monthsAhead', () => {
  it('lists the calendar months right after the given one', () => {
    expect(monthsAhead('2026-01', 3)).toEqual(['2026-02', '2026-03', '2026-04']);
  });

  it('rolls over the year', () => {
    expect(monthsAhead('2026-11', 3)).toEqual(['2026-12', '2027-01', '2027-02']);
  });
});

describe('projectTrend', () => {
  it('refuses to project below the minimum history, instead of guessing', () => {
    const history = series('2026-01', [10, 12, 11, 13, 9]); // 5 months, one short
    expect(history).toHaveLength(MIN_HISTORY_MONTHS - 1);

    const result = projectTrend(history, monthsAhead('2026-05', 3));

    expect(result).toEqual({ status: 'insufficient-history', historyMonths: 5, points: [] });
  });

  it('projects a perfect linear trend with no uncertainty at all', () => {
    // y = 100 + 10x exactly: every point sits on the line, so the residual is 0.
    const history = series('2026-01', [100, 110, 120, 130, 140, 150]);

    const result = projectTrend(history, monthsAhead('2026-06', 2));

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.points[0].value).toBeCloseTo(160, 5);
    expect(result.points[0].low).toBeCloseTo(160, 5);
    expect(result.points[0].high).toBeCloseTo(160, 5);
    expect(result.points[1].value).toBeCloseTo(170, 5);
  });

  it('widens the interval the further out it projects', () => {
    const history = series('2026-01', [100, 108, 95, 115, 101, 112]);

    const result = projectTrend(history, monthsAhead('2026-06', 12));
    if (result.status !== 'ok') throw new Error('unreachable');

    const nearWidth = result.points[0].high - result.points[0].low;
    const farWidth = result.points[11].high - result.points[11].low;
    expect(farWidth).toBeGreaterThan(nearWidth);
  });

  it('never projects a negative value or a negative lower bound', () => {
    const history = series('2026-01', [10, 8, 5, 2, 1, 0]); // sharply declining

    const result = projectTrend(history, monthsAhead('2026-06', 6));
    if (result.status !== 'ok') throw new Error('unreachable');

    for (const point of result.points) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.low).toBeGreaterThanOrEqual(0);
    }
  });

  it('evaluates further out for a month beyond the immediate next one, without needing it to be contiguous', () => {
    const history = series('2026-01', [100, 108, 95, 115, 101, 112]);

    // Two years past the last observed month — the composing caller's job, not this function's.
    const near = projectTrend(history, ['2026-07']);
    const far = projectTrend(history, ['2028-06']);
    if (near.status !== 'ok' || far.status !== 'ok') throw new Error('unreachable');

    expect(far.points[0].high - far.points[0].low).toBeGreaterThan(near.points[0].high - near.points[0].low);
  });

  it('falls back to the flat mean for a constant series, with a non-negative interval', () => {
    const history = series('2026-01', [50, 50, 50, 50, 50, 50]);

    const result = projectTrend(history, monthsAhead('2026-06', 1));
    if (result.status !== 'ok') throw new Error('unreachable');

    expect(result.points[0].value).toBeCloseTo(50, 5);
    expect(result.points[0].low).toBeLessThanOrEqual(50);
    expect(result.points[0].high).toBeGreaterThanOrEqual(50);
  });
});
