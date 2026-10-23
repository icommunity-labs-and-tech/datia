import type { Municipality } from '@/lib/map/municipality';

/** One slice of a total: what it is, and how much of it. */
export interface Share {
  key: string;
  label: string;
  value: number;
}

export interface ConsumptionRow {
  id: string;
  periodStart: Date;
  consumptionKwh: number;
  lifecycleStage: string;
  source: { id: string; name: string; energyCarrier: string; renewableShare: number | null };
  asset: { id: string; name: string; latitude: number | null; longitude: number | null };
}

export interface EmissionRow {
  id: string;
  co2eKg: number;
  scope: string;
  verificationStatus: string;
  emissionFactor: number | null;
  consumption: { id: string; periodStart: Date; consumptionKwh: number };
  source: { name: string };
  asset: { id: string; name: string };
}

export interface ConsumptionBreakdown {
  assets: number;
  sources: number;
  /** % of the kWh whose source declares a renewable share; null when none does. */
  renewableShare: number | null;
  byAsset: Share[];
  byMunicipality: Share[];
  byCarrier: Share[];
  latest: Array<{
    id: string;
    periodStart: string;
    consumptionKwh: number;
    lifecycleStage: string;
    source: string;
    assetId: string;
    asset: string;
  }>;
}

export interface EmissionBreakdown {
  /** kg CO₂e per kWh of the consumption the emissions were calculated from. */
  intensity: number | null;
  byAsset: Share[];
  byScope: Share[];
  byStatus: Array<{ status: string; records: number; co2eKg: number }>;
  latest: Array<{
    id: string;
    periodStart: string;
    co2eKg: number;
    scope: string;
    verificationStatus: string;
    emissionFactor: number | null;
    source: string;
    assetId: string;
    asset: string;
  }>;
}

const LATEST = 50;

/** Sums by key, largest first. */
function shares<T>(rows: T[], key: (r: T) => string, label: (r: T) => string, value: (r: T) => number): Share[] {
  const byKey = new Map<string, Share>();
  for (const r of rows) {
    const k = key(r);
    const s = byKey.get(k) ?? { key: k, label: label(r), value: 0 };
    s.value += value(r);
    byKey.set(k, s);
  }
  return [...byKey.values()].sort((a, b) => b.value - a.value);
}

export function consumptionBreakdown(
  rows: ConsumptionRow[],
  locate: (lat: number, lng: number) => Municipality | null
): ConsumptionBreakdown {
  const placeOf = new Map<string, Municipality | null>();
  for (const r of rows) {
    if (placeOf.has(r.asset.id)) continue;
    const { latitude, longitude } = r.asset;
    placeOf.set(r.asset.id, latitude != null && longitude != null ? locate(latitude, longitude) : null);
  }

  const byMunicipality = shares(
    rows.filter((r) => placeOf.get(r.asset.id)),
    (r) => {
      const m = placeOf.get(r.asset.id)!;
      return `${m.name}|${m.province}`;
    },
    (r) => placeOf.get(r.asset.id)!.name,
    (r) => r.consumptionKwh
  );
  // Two municipalities can share a name; the province tells them apart.
  const nameCount = new Map<string, number>();
  for (const s of byMunicipality) nameCount.set(s.label, (nameCount.get(s.label) ?? 0) + 1);
  for (const s of byMunicipality) {
    if (nameCount.get(s.label)! > 1) s.label = `${s.label} (${s.key.split('|')[1]})`;
  }

  const declared = rows.filter((r) => r.source.renewableShare != null);
  const declaredKwh = declared.reduce((n, r) => n + r.consumptionKwh, 0);

  return {
    assets: new Set(rows.map((r) => r.asset.id)).size,
    sources: new Set(rows.map((r) => r.source.id)).size,
    renewableShare: declaredKwh
      ? declared.reduce((n, r) => n + (r.consumptionKwh * r.source.renewableShare!) / 100, 0) / declaredKwh * 100
      : null,
    byAsset: shares(rows, (r) => r.asset.id, (r) => r.asset.name, (r) => r.consumptionKwh),
    byMunicipality,
    byCarrier: shares(rows, (r) => r.source.energyCarrier, (r) => r.source.energyCarrier, (r) => r.consumptionKwh),
    latest: [...rows]
      .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime())
      .slice(0, LATEST)
      .map((r) => ({
        id: r.id,
        periodStart: r.periodStart.toISOString(),
        consumptionKwh: r.consumptionKwh,
        lifecycleStage: r.lifecycleStage,
        source: r.source.name,
        assetId: r.asset.id,
        asset: r.asset.name,
      })),
  };
}

export function emissionBreakdown(rows: EmissionRow[]): EmissionBreakdown {
  // A consumption can carry more than one emission (one per scope, or a
  // recalculation); its kWh count once.
  const kwhByConsumption = new Map(rows.map((r) => [r.consumption.id, r.consumption.consumptionKwh]));
  const kwh = [...kwhByConsumption.values()].reduce((n, v) => n + v, 0);
  const co2e = rows.reduce((n, r) => n + r.co2eKg, 0);

  const byStatus = new Map<string, { status: string; records: number; co2eKg: number }>();
  for (const r of rows) {
    const s = byStatus.get(r.verificationStatus) ?? { status: r.verificationStatus, records: 0, co2eKg: 0 };
    s.records += 1;
    s.co2eKg += r.co2eKg;
    byStatus.set(r.verificationStatus, s);
  }

  return {
    intensity: kwh ? co2e / kwh : null,
    byAsset: shares(rows, (r) => r.asset.id, (r) => r.asset.name, (r) => r.co2eKg),
    byScope: shares(rows, (r) => r.scope, (r) => r.scope, (r) => r.co2eKg),
    byStatus: ['VERIFIED', 'PENDING', 'REJECTED'].flatMap((s) => (byStatus.has(s) ? [byStatus.get(s)!] : [])),
    latest: [...rows]
      .sort((a, b) => b.consumption.periodStart.getTime() - a.consumption.periodStart.getTime())
      .slice(0, LATEST)
      .map((r) => ({
        id: r.id,
        periodStart: r.consumption.periodStart.toISOString(),
        co2eKg: r.co2eKg,
        scope: r.scope,
        verificationStatus: r.verificationStatus,
        emissionFactor: r.emissionFactor,
        source: r.source.name,
        assetId: r.asset.id,
        asset: r.asset.name,
      })),
  };
}
