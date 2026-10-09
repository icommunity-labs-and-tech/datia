import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Row-by-month grids for comparing sources, or GHG scopes, over the last 12
 * months — fed to a heatmap rather than a line per row.
 */

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { emissionRecord: { findMany: vi.fn() }, energyConsumption: { findMany: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { computeConsumptionHeatmap, computeEmissionsHeatmap } from '../heatmap';

const companyScope = { organizationId: 'org-1', companyId: 'co-1' };
const orgScope = { organizationId: 'org-1', companyId: null };

const consumptionRow = (sourceId: string, sourceName: string, companyName: string | null, month: string, kwh: number) => ({
  periodStart: new Date(`${month}-10`),
  consumptionKwh: kwh,
  EnergySource: { id: sourceId, name: sourceName, Asset: { Company: companyName ? { name: companyName } : null } },
});

// Fixed "now" so the last-12-months window is deterministic across runs.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-15T00:00:00Z'));
});

describe('computeConsumptionHeatmap', () => {
  it('aligns each source\'s monthly values to the shared 12-month window', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Solar', 'Norte', '2026-09', 100),
      consumptionRow('s-1', 'Solar', 'Norte', '2026-10', 50),
      consumptionRow('s-2', 'Grid', 'Norte', '2026-10', 200),
    ]);

    const heatmap = await computeConsumptionHeatmap(companyScope);

    expect(heatmap.months.at(-1)).toBe('2026-10');
    expect(heatmap.months).toHaveLength(12);
    expect(heatmap.rows).toHaveLength(2);
    const solar = heatmap.rows.find((r) => r.label === 'Solar')!;
    expect(solar.values[heatmap.months.indexOf('2026-09')]).toBe(100);
    expect(solar.values[heatmap.months.indexOf('2026-10')]).toBe(50);
    expect(solar.values[0]).toBeNull();
  });

  it('tracks the largest cell as max, for one shared color scale', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Solar', 'Norte', '2026-10', 50),
      consumptionRow('s-2', 'Grid', 'Norte', '2026-10', 200),
    ]);

    const heatmap = await computeConsumptionHeatmap(companyScope);
    expect(heatmap.max).toBe(200);
  });

  it('omits a source with no reading inside the window', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Old', 'Norte', '2020-01', 999),
    ]);

    const heatmap = await computeConsumptionHeatmap(companyScope);
    expect(heatmap.rows).toHaveLength(0);
  });

  it('orders rows by total consumption, heaviest first', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Solar', 'Norte', '2026-10', 50),
      consumptionRow('s-2', 'Grid', 'Norte', '2026-10', 200),
    ]);

    const heatmap = await computeConsumptionHeatmap(companyScope);
    expect(heatmap.rows.map((r) => r.label)).toEqual(['Grid', 'Solar']);
  });

  it('prefixes each row with its company when the scope spans the whole organization', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Solar', 'Norte', '2026-10', 50),
      consumptionRow('s-2', 'Grid', 'Sur', '2026-10', 30),
    ]);

    const heatmap = await computeConsumptionHeatmap(orgScope);
    expect(heatmap.rows.map((r) => r.label).sort()).toEqual(['Norte · Solar', 'Sur · Grid']);
  });

  it('does not repeat the company name when the scope is already one company', async () => {
    mockPrisma.energyConsumption.findMany.mockResolvedValue([
      consumptionRow('s-1', 'Solar', 'Norte', '2026-10', 50),
    ]);

    const heatmap = await computeConsumptionHeatmap(companyScope);
    expect(heatmap.rows[0].label).toBe('Solar');
  });
});

describe('computeEmissionsHeatmap', () => {
  it('keys each row by GHG scope and each cell by the reading\'s period, not when it was calculated', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValue([
      { co2eKg: 10, scope: 'SCOPE_2', EnergyConsumption: { periodStart: new Date('2026-09-15') } },
      { co2eKg: 5, scope: 'SCOPE_2', EnergyConsumption: { periodStart: new Date('2026-09-20') } },
      { co2eKg: 3, scope: 'SCOPE_1', EnergyConsumption: { periodStart: new Date('2026-10-01') } },
    ]);

    const heatmap = await computeEmissionsHeatmap(companyScope);

    const scope2 = heatmap.rows.find((r) => r.label === 'SCOPE_2')!;
    expect(scope2.values[heatmap.months.indexOf('2026-09')]).toBe(15);
    const scope1 = heatmap.rows.find((r) => r.label === 'SCOPE_1')!;
    expect(scope1.values[heatmap.months.indexOf('2026-10')]).toBe(3);
  });

  it('only ever has the three GHG scope rows, never more', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValue([
      { co2eKg: 1, scope: 'SCOPE_1', EnergyConsumption: { periodStart: new Date('2026-10-01') } },
      { co2eKg: 1, scope: 'SCOPE_2', EnergyConsumption: { periodStart: new Date('2026-10-01') } },
      { co2eKg: 1, scope: 'SCOPE_3', EnergyConsumption: { periodStart: new Date('2026-10-01') } },
    ]);

    const heatmap = await computeEmissionsHeatmap(companyScope);
    expect(heatmap.rows.map((r) => r.label).sort()).toEqual(['SCOPE_1', 'SCOPE_2', 'SCOPE_3']);
  });

  it('drops a scope with no reading inside the window', async () => {
    mockPrisma.emissionRecord.findMany.mockResolvedValue([
      { co2eKg: 1, scope: 'SCOPE_1', EnergyConsumption: { periodStart: new Date('2026-10-01') } },
    ]);

    const heatmap = await computeEmissionsHeatmap(companyScope);
    expect(heatmap.rows).toHaveLength(1);
  });
});
