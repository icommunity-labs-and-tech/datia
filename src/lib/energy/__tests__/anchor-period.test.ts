import { describe, it, expect } from 'vitest';
import { periodLabel } from '../anchor-service';

/**
 * The period is what makes a figure attributable: the same asset produces twelve
 * indistinguishable numbers a year without it.
 */
describe('periodLabel', () => {
  it('shows a single day for a reading that covers one', () => {
    expect(
      periodLabel(new Date('2026-03-14T00:00:00Z'), new Date('2026-03-14T23:59:59Z'))
    ).toBe('2026-03-14');
  });

  it('shows the range for a reading that spans more', () => {
    expect(
      periodLabel(new Date('2026-03-01T00:00:00Z'), new Date('2026-03-31T23:59:59Z'))
    ).toBe('2026-03-01 → 2026-03-31');
  });

  it('does not drift with the local timezone', () => {
    // Late UTC evening is already the next day in Madrid.
    expect(
      periodLabel(new Date('2026-03-14T23:30:00Z'), new Date('2026-03-14T23:59:00Z'))
    ).toBe('2026-03-14');
  });
});
