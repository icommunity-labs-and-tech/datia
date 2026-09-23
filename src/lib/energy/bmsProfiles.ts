/**
 * Source profiles for the BMS simulation.
 *
 * The simulation used to model a single case — grid electricity — which left the
 * renewable half of the ESPR story untested: renewable share, guarantee of
 * origin, installed capacity and lifecycle emission factors never got exercised.
 * A profile bundles everything that changes between an asset drawing from the
 * grid and one generating its own photovoltaic energy.
 *
 * Shared by the server action and `scripts/simulate-bms.ts` so both produce the
 * same numbers; they used to keep separate copies of these constants.
 */

export type BmsProfileId = 'grid' | 'solar';

export interface BmsProfile {
  id: BmsProfileId;
  /** Source name, with the year appended at build time. */
  namePrefix: string;
  energyCarrier: 'ELECTRICITY';
  generationTechnology: string;
  /** Installed capacity, kW. Null for a grid supply point. */
  capacityKw: number | null;
  /** 0–100. */
  renewableShare: number;
  /** kgCO2e/kWh. */
  emissionFactor: number;
  emissionFactorSource: string;
  scope: 'SCOPE_2' | 'SCOPE_3';
  systemBoundary: 'CRADLE_TO_GATE' | 'CRADLE_TO_GRAVE';
  calculationMethodology: string;
  measurementStandard: string;
  /** Whether the profile carries a guarantee of origin certificate. */
  hasGuaranteeOfOrigin: boolean;
  /** Mean monthly energy, kWh, before the seasonal curve. */
  baseKwh: number;
  /** Twelve multipliers, January to December. */
  seasonal: number[];
}

/**
 * Grid demand for a mid-size industrial asset: peaks in Jan/Feb for heating and
 * Jul/Aug for cooling, following REE demand patterns for Spain.
 */
const GRID_SEASONAL = [1.10, 1.05, 0.95, 0.88, 0.85, 0.92, 1.15, 1.12, 0.95, 0.90, 0.98, 1.08];

/**
 * Photovoltaic yield, which runs opposite to grid demand: a summer maximum and a
 * winter trough of roughly a third of it.
 */
const SOLAR_SEASONAL = [0.42, 0.55, 0.78, 0.92, 1.08, 1.20, 1.24, 1.14, 0.94, 0.68, 0.47, 0.38];

export const BMS_PROFILES: Record<BmsProfileId, BmsProfile> = {
  grid: {
    id: 'grid',
    namePrefix: 'Red eléctrica — Simulación BMS',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'Grid',
    capacityKw: null,
    // Spanish peninsular mix is far from fully decarbonised.
    renewableShare: 22,
    emissionFactor: 0.233,
    emissionFactorSource: 'IEA Spain 2023',
    // Purchased electricity is scope 2, measured to the point of delivery.
    scope: 'SCOPE_2',
    systemBoundary: 'CRADLE_TO_GATE',
    calculationMethodology: 'GHG Protocol Corporate Standard',
    measurementStandard: 'IEC 62053',
    hasGuaranteeOfOrigin: false,
    baseKwh: 8_500,
    seasonal: GRID_SEASONAL,
  },
  solar: {
    id: 'solar',
    namePrefix: 'Autoconsumo fotovoltaico — Simulación BMS',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'photovoltaic',
    capacityKw: 250,
    renewableShare: 100,
    // On-site generation burns no fuel, so what remains is the embodied
    // footprint of the installation: IPCC AR6 lifecycle median for PV.
    emissionFactor: 0.041,
    emissionFactorSource: 'IPCC AR6 · ciclo de vida fotovoltaico',
    // No combustion and nothing purchased, so the residual footprint is
    // upstream — scope 3, over the whole life of the installation.
    scope: 'SCOPE_3',
    systemBoundary: 'CRADLE_TO_GRAVE',
    calculationMethodology: 'ISO 14067',
    measurementStandard: 'IEC 61724-1',
    hasGuaranteeOfOrigin: true,
    baseKwh: 6_200,
    seasonal: SOLAR_SEASONAL,
  },
};

export const DEFAULT_BMS_PROFILE: BmsProfileId = 'grid';

export function resolveBmsProfile(id?: string | null): BmsProfile {
  return BMS_PROFILES[(id as BmsProfileId) ?? DEFAULT_BMS_PROFILE] ?? BMS_PROFILES[DEFAULT_BMS_PROFILE];
}

/** Source name for a profile and year — also the key the simulation reuses. */
export function bmsSourceName(profile: BmsProfile, year: number): string {
  return `${profile.namePrefix} ${year}`;
}

/**
 * Guarantee of origin reference. Derived from the asset and year rather than
 * random, so re-running the simulation does not invent a second certificate for
 * energy that was already accounted for.
 */
export function bmsGuaranteeOfOrigin(profile: BmsProfile, assetId: string, year: number): string | undefined {
  if (!profile.hasGuaranteeOfOrigin) return undefined;
  const suffix = assetId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `GO-ES-${year}-${suffix}`;
}

/** Monthly energy for a profile, with ±5 % noise so readings look metered. */
export function bmsMonthlyKwh(profile: BmsProfile, monthIndex: number): number {
  const value = profile.baseKwh * profile.seasonal[monthIndex] * (0.95 + Math.random() * 0.10);
  return parseFloat(value.toFixed(2));
}

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Days in a month, leap years included. */
export function bmsDaysInMonth(year: number, monthIndex: number): number {
  if (monthIndex === 1 && (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) return 29;
  return DAYS_IN_MONTH[monthIndex];
}

/**
 * A day's energy.
 *
 * Metering daily rather than monthly is what a BMS actually reports, and the
 * shape differs: grid demand drops at weekends when the site is idle, while
 * photovoltaic output does not care what day it is but swings much harder with
 * the weather. Both are noisier day to day than a monthly total ever shows.
 */
export function bmsDailyKwh(profile: BmsProfile, year: number, monthIndex: number, day: number): number {
  const daily = (profile.baseKwh * profile.seasonal[monthIndex]) / bmsDaysInMonth(year, monthIndex);

  if (profile.id === 'solar') {
    // Cloud cover moves output far more than any calendar effect.
    const weather = 0.55 + Math.random() * 0.65;
    return parseFloat((daily * weather).toFixed(2));
  }

  const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const factor = (weekend ? 0.62 : 1.12) * (0.94 + Math.random() * 0.12);
  return parseFloat((daily * factor).toFixed(2));
}

/**
 * Sensor telemetry reported alongside a monthly reading.
 *
 * A real BMS does not just meter kWh: it reports the conditions the figure was
 * produced under, and those are what make an energy claim auditable — a
 * performance ratio or an inverter efficiency explains a drop that the kWh alone
 * only shows. They live in the consumption's `operatingConditions`, which the
 * schema reserves for exactly this.
 */
export interface BmsSensorReadings {
  [key: string]: string | number;
}

/** Mean ambient temperature in Spain by month, °C. */
const AMBIENT_C = [8.4, 9.6, 12.1, 14.3, 18.2, 23.1, 26.4, 26.0, 22.3, 17.1, 12.0, 9.1];

const jitter = (value: number, spread: number, decimals = 1): number =>
  parseFloat((value + (Math.random() - 0.5) * spread).toFixed(decimals));

export function bmsSensorReadings(
  profile: BmsProfile,
  monthIndex: number,
  kwh: number
): BmsSensorReadings {
  const ambient = AMBIENT_C[monthIndex];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];

  if (profile.id === 'solar') {
    // Panels run well above ambient, and their efficiency falls as they heat up.
    const moduleTemp = jitter(ambient + 18, 3);
    return {
      irradianceKwhM2: jitter((profile.seasonal[monthIndex] * 165) / daysInMonth, 0.6, 2),
      ambientTempC: jitter(ambient, 1.5),
      moduleTempC: moduleTemp,
      // Ratio of actual to theoretical yield: the headline health metric of a PV plant.
      performanceRatio: jitter(0.82 - (moduleTemp - 25) * 0.0012, 0.02, 3),
      inverterEfficiency: jitter(0.977, 0.006, 3),
      dcAcRatio: jitter(1.24, 0.03, 2),
      specificYieldKwhKwp: profile.capacityKw
        ? jitter(kwh / profile.capacityKw, 1.5, 1)
        : 0,
    };
  }

  // Grid supply: what matters is how the demand is drawn, not how it was made.
  const loadFactor = jitter(0.61, 0.08, 3);
  return {
    ambientTempC: jitter(ambient, 1.5),
    peakDemandKw: jitter(kwh / (daysInMonth * 24 * loadFactor), 4, 1),
    loadFactor,
    powerFactor: jitter(0.96, 0.03, 3),
    voltageV: jitter(400, 6, 1),
    // Share drawn outside the cheap night window.
    peakHoursShare: jitter(0.38, 0.06, 3),
  };
}
