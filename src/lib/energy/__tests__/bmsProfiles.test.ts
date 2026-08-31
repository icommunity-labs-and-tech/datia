import { describe, it, expect } from 'vitest';
import {
  BMS_PROFILES,
  DEFAULT_BMS_PROFILE,
  bmsGuaranteeOfOrigin,
  bmsMonthlyKwh,
  bmsSensorReadings,
  bmsSourceName,
  resolveBmsProfile,
} from '../bmsProfiles';

describe('resolveBmsProfile', () => {
  it('resolves each known profile by id', () => {
    expect(resolveBmsProfile('grid').id).toBe('grid');
    expect(resolveBmsProfile('solar').id).toBe('solar');
  });

  it('falls back to the default for an unknown, empty or missing id', () => {
    expect(resolveBmsProfile('nuclear').id).toBe(DEFAULT_BMS_PROFILE);
    expect(resolveBmsProfile('').id).toBe(DEFAULT_BMS_PROFILE);
    expect(resolveBmsProfile(null).id).toBe(DEFAULT_BMS_PROFILE);
    expect(resolveBmsProfile(undefined).id).toBe(DEFAULT_BMS_PROFILE);
  });
});

describe('profile definitions', () => {
  it('gives every profile a full twelve-month seasonal curve', () => {
    for (const profile of Object.values(BMS_PROFILES)) {
      expect(profile.seasonal).toHaveLength(12);
      expect(profile.seasonal.every((v) => v > 0)).toBe(true);
    }
  });

  it('keeps renewable share within the range the domain service validates', () => {
    for (const profile of Object.values(BMS_PROFILES)) {
      expect(profile.renewableShare).toBeGreaterThanOrEqual(0);
      expect(profile.renewableShare).toBeLessThanOrEqual(100);
    }
  });

  it('models on-site solar as fully renewable and far cleaner than the grid', () => {
    const { grid, solar } = BMS_PROFILES;
    expect(solar.renewableShare).toBe(100);
    expect(solar.emissionFactor).toBeLessThan(grid.emissionFactor);
  });

  it('assigns the GHG scope each source actually belongs to', () => {
    // Purchased electricity is scope 2; on-site generation leaves only the
    // embodied upstream footprint, which is scope 3.
    expect(BMS_PROFILES.grid.scope).toBe('SCOPE_2');
    expect(BMS_PROFILES.solar.scope).toBe('SCOPE_3');
  });

  it('peaks solar in summer and grid demand in winter', () => {
    const peak = (curve: number[]) => curve.indexOf(Math.max(...curve));
    expect(peak(BMS_PROFILES.solar.seasonal)).toBe(6); // julio
    expect(peak(BMS_PROFILES.grid.seasonal)).toBe(6); // julio, por refrigeración
    // What separates them is the winter: solar collapses, grid demand does not.
    expect(BMS_PROFILES.solar.seasonal[0]).toBeLessThan(0.5);
    expect(BMS_PROFILES.grid.seasonal[0]).toBeGreaterThan(1);
  });
});

describe('bmsSourceName', () => {
  it('is stable for the same profile and year, which is what makes reuse work', () => {
    const profile = BMS_PROFILES.solar;
    expect(bmsSourceName(profile, 2025)).toBe(bmsSourceName(profile, 2025));
  });

  it('separates years and profiles into different sources', () => {
    expect(bmsSourceName(BMS_PROFILES.grid, 2025)).not.toBe(bmsSourceName(BMS_PROFILES.grid, 2026));
    expect(bmsSourceName(BMS_PROFILES.grid, 2025)).not.toBe(bmsSourceName(BMS_PROFILES.solar, 2025));
  });
});

describe('bmsGuaranteeOfOrigin', () => {
  it('issues no certificate for grid supply', () => {
    expect(bmsGuaranteeOfOrigin(BMS_PROFILES.grid, 'item-abc123', 2025)).toBeUndefined();
  });

  it('derives the reference from asset and year instead of at random', () => {
    const a = bmsGuaranteeOfOrigin(BMS_PROFILES.solar, 'item-abc123', 2025);
    const b = bmsGuaranteeOfOrigin(BMS_PROFILES.solar, 'item-abc123', 2025);
    expect(a).toBe(b);
    expect(a).toMatch(/^GO-ES-2025-[A-Z0-9]{1,6}$/);
  });

  it('does not reuse one certificate across assets or years', () => {
    const uno = bmsGuaranteeOfOrigin(BMS_PROFILES.solar, 'item-abc123', 2025);
    expect(bmsGuaranteeOfOrigin(BMS_PROFILES.solar, 'item-xyz789', 2025)).not.toBe(uno);
    expect(bmsGuaranteeOfOrigin(BMS_PROFILES.solar, 'item-abc123', 2026)).not.toBe(uno);
  });
});

describe('bmsMonthlyKwh', () => {
  it('stays within the ±5 % noise band around the seasonal baseline', () => {
    const profile = BMS_PROFILES.grid;
    for (let month = 0; month < 12; month++) {
      const baseline = profile.baseKwh * profile.seasonal[month];
      for (let run = 0; run < 50; run++) {
        const value = bmsMonthlyKwh(profile, month);
        expect(value).toBeGreaterThanOrEqual(baseline * 0.95 - 0.01);
        expect(value).toBeLessThanOrEqual(baseline * 1.05 + 0.01);
      }
    }
  });

  it('reports a solar winter well below its summer', () => {
    const enero = bmsMonthlyKwh(BMS_PROFILES.solar, 0);
    const julio = bmsMonthlyKwh(BMS_PROFILES.solar, 6);
    expect(enero).toBeLessThan(julio);
  });
});

describe('bmsSensorReadings', () => {
  it('reports what explains a photovoltaic yield', () => {
    const r = bmsSensorReadings(BMS_PROFILES.solar, 6, 7_400);
    expect(r).toHaveProperty('irradianceKwhM2');
    expect(r).toHaveProperty('performanceRatio');
    expect(r).toHaveProperty('inverterEfficiency');
    expect(r).toHaveProperty('specificYieldKwhKwp');
    // Panels sit above ambient, which is why their efficiency drops in summer.
    expect(r.moduleTempC as number).toBeGreaterThan(r.ambientTempC as number);
  });

  it('reports how grid demand is drawn, not how it was generated', () => {
    const r = bmsSensorReadings(BMS_PROFILES.grid, 0, 9_300);
    expect(r).toHaveProperty('peakDemandKw');
    expect(r).toHaveProperty('loadFactor');
    expect(r).toHaveProperty('powerFactor');
    expect(r).not.toHaveProperty('irradianceKwhM2');
  });

  it('keeps every reading within a physically plausible range', () => {
    for (let month = 0; month < 12; month++) {
      const solar = bmsSensorReadings(BMS_PROFILES.solar, month, 6_000);
      expect(solar.performanceRatio as number).toBeGreaterThan(0.6);
      expect(solar.performanceRatio as number).toBeLessThan(1);
      expect(solar.inverterEfficiency as number).toBeGreaterThan(0.9);
      expect(solar.inverterEfficiency as number).toBeLessThanOrEqual(1);

      const grid = bmsSensorReadings(BMS_PROFILES.grid, month, 9_000);
      expect(grid.loadFactor as number).toBeGreaterThan(0);
      expect(grid.loadFactor as number).toBeLessThan(1);
      expect(grid.powerFactor as number).toBeGreaterThan(0.85);
      expect(grid.powerFactor as number).toBeLessThanOrEqual(1);
      expect(grid.peakDemandKw as number).toBeGreaterThan(0);
    }
  });

  it('tracks the seasons: colder ambient in winter than in summer', () => {
    const enero = bmsSensorReadings(BMS_PROFILES.grid, 0, 9_000).ambientTempC as number;
    const julio = bmsSensorReadings(BMS_PROFILES.grid, 6, 9_000).ambientTempC as number;
    expect(enero).toBeLessThan(julio);
  });
});
