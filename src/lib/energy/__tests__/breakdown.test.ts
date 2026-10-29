import { describe, it, expect } from 'vitest';
import { consumptionBreakdown, emissionBreakdown, type ConsumptionRow, type EmissionRow } from '../breakdown';

const MALAGA = { name: 'Málaga', province: 'Málaga' };

const consumption = (
  id: string,
  kwh: number,
  overrides: { asset?: Partial<ConsumptionRow['asset']>; source?: Partial<ConsumptionRow['source']>; month?: number } = {}
): ConsumptionRow => ({
  id,
  periodStart: new Date(Date.UTC(2026, overrides.month ?? 0, 1)),
  consumptionKwh: kwh,
  lifecycleStage: 'USE',
  source: { id: 's1', name: 'Red', energyCarrier: 'ELECTRICITY', renewableShare: null, ...overrides.source },
  asset: { id: 'a1', name: 'Turbina', latitude: 36.72, longitude: -4.42, ...overrides.asset },
});

describe('consumptionBreakdown', () => {
  const locate = (lat: number) => (lat > 36 ? MALAGA : null);

  it('ranks assets, places and carriers by kWh, largest first', () => {
    const b = consumptionBreakdown(
      [
        consumption('c1', 100),
        consumption('c2', 300, { asset: { id: 'a2', name: 'Panel' }, source: { id: 's2', energyCarrier: 'NATURAL_GAS' } }),
        consumption('c3', 50),
      ],
      locate
    );
    expect(b.byAsset.map((s) => [s.label, s.value])).toEqual([['Panel', 300], ['Turbina', 150]]);
    expect(b.byCarrier.map((s) => [s.key, s.value])).toEqual([['NATURAL_GAS', 300], ['ELECTRICITY', 150]]);
    expect(b.byMunicipality).toEqual([{ key: 'Málaga|Málaga', label: 'Málaga', value: 450 }]);
    expect([b.assets, b.sources]).toEqual([2, 2]);
  });

  it('leaves assets with no place out of the municipality ranking', () => {
    const b = consumptionBreakdown([consumption('c1', 100, { asset: { latitude: null, longitude: null } })], locate);
    expect(b.byMunicipality).toEqual([]);
    expect(b.byAsset).toHaveLength(1);
  });

  it('adds the province when two municipalities share a name', () => {
    const b = consumptionBreakdown(
      [consumption('c1', 1, { asset: { id: 'a1' } }), consumption('c2', 2, { asset: { id: 'a2', latitude: 40 } })],
      (lat) => (lat === 40 ? { name: 'Castejón', province: 'Navarra' } : { name: 'Castejón', province: 'Cuenca' })
    );
    expect(b.byMunicipality.map((s) => s.label)).toEqual(['Castejón (Navarra)', 'Castejón (Cuenca)']);
  });

  it('weights the renewable share by kWh, over the sources that declare one', () => {
    const b = consumptionBreakdown(
      [
        consumption('c1', 300, { source: { id: 's1', renewableShare: 100 } }),
        consumption('c2', 100, { source: { id: 's2', renewableShare: 0 } }),
        consumption('c3', 1000, { source: { id: 's3', renewableShare: null } }),
      ],
      locate
    );
    expect(b.renewableShare).toBe(75);
  });

  it('keeps each asset\'s kWh, and the part of it with a declared origin', () => {
    const b = consumptionBreakdown(
      [
        consumption('c1', 300, { source: { id: 's1', renewableShare: 50 } }),
        consumption('c2', 100, { source: { id: 's2', renewableShare: null } }),
      ],
      locate
    );
    expect(b.perAsset.a1).toEqual({ kwh: 400, declaredKwh: 300, renewableKwh: 150 });
  });

  it('has no renewable share when no source declares one', () => {
    expect(consumptionBreakdown([consumption('c1', 10)], locate).renewableShare).toBeNull();
  });
});

const emission = (id: string, co2eKg: number, overrides: Partial<EmissionRow> = {}): EmissionRow => ({
  id,
  co2eKg,
  scope: 'SCOPE_2',
  verificationStatus: 'VERIFIED',
  emissionFactor: 0.2,
  consumption: { id: `c-${id}`, periodStart: new Date(Date.UTC(2026, 0, 1)), consumptionKwh: 100 },
  source: { name: 'Red' },
  asset: { id: 'a1', name: 'Turbina' },
  ...overrides,
});

describe('emissionBreakdown', () => {
  it('measures intensity against the consumption, counting each consumption once', () => {
    const shared = { id: 'c1', periodStart: new Date(Date.UTC(2026, 0, 1)), consumptionKwh: 100 };
    const b = emissionBreakdown([
      emission('e1', 20, { consumption: shared, scope: 'SCOPE_2' }),
      emission('e2', 10, { consumption: shared, scope: 'SCOPE_3' }),
    ]);
    expect(b.intensity).toBeCloseTo(0.3);
    expect(b.byScope.map((s) => [s.key, s.value])).toEqual([['SCOPE_2', 20], ['SCOPE_3', 10]]);
  });

  it('counts records and CO₂e per verification status, verified first', () => {
    const b = emissionBreakdown([
      emission('e1', 5, { verificationStatus: 'PENDING' }),
      emission('e2', 7),
      emission('e3', 1, { verificationStatus: 'PENDING' }),
    ]);
    expect(b.byStatus).toEqual([
      { status: 'VERIFIED', records: 1, co2eKg: 7 },
      { status: 'PENDING', records: 2, co2eKg: 6 },
    ]);
  });

  it('has no intensity without emissions', () => {
    expect(emissionBreakdown([]).intensity).toBeNull();
  });
});
