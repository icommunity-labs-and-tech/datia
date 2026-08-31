#!/usr/bin/env npx tsx
/**
 * BMS/sensor simulation — Bloque 6 (EU ESPR/DPP)
 *
 * Simulates one year of BMS readings for an industrial asset by calling
 * the Datia REST API — exactly as a real BMS integration would.
 *
 * Pipeline per month:
 *   POST /api/v1/energy/source       (once, reused across months)
 *   POST /api/v1/energy/consumption  (monthly reading)
 *   POST /api/v1/emissions           (CO₂ calculation)
 *
 * Config (env vars):
 *   BASE_URL   API base URL              (default: http://localhost:3000)
 *   API_TOKEN  Bearer token              (required)
 *   ITEM_ID    Item/product ID           (required)
 *   YEAR       Simulation year           (default: last year)
 *   PROFILE    grid | solar              (default: grid)
 *   DRY_RUN    Print payloads, no calls  (default: unset)
 *
 * Re-running for the same item, year and profile reuses the existing source and
 * skips months already recorded, so a repeated run does not double-count the
 * energy.
 *
 * Usage:
 *   API_TOKEN=xxx ITEM_ID=yyy npx tsx scripts/simulate-bms.ts
 *   API_TOKEN=xxx ITEM_ID=yyy PROFILE=solar npx tsx scripts/simulate-bms.ts
 *   API_TOKEN=xxx ITEM_ID=yyy DRY_RUN=1 npx tsx scripts/simulate-bms.ts
 */

import {
  bmsGuaranteeOfOrigin,
  bmsMonthlyKwh,
  bmsSensorReadings,
  bmsSourceName,
  resolveBmsProfile,
} from '../src/lib/energy/bmsProfiles';

// ── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN ?? '';
const ITEM_ID = process.env.ITEM_ID ?? '';
const YEAR = parseInt(process.env.YEAR ?? String(new Date().getFullYear() - 1), 10);
const DRY_RUN = Boolean(process.env.DRY_RUN);

// Profile carries the emission factors, seasonal curve and renewable metadata,
// shared with the in-app simulator so both produce the same numbers.
const PROFILE = resolveBmsProfile(process.env.PROFILE);
const EMISSION_FACTOR = PROFILE.emissionFactor;
const EMISSION_FACTOR_SOURCE = PROFILE.emissionFactorSource;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString();
}

async function post(path: string, body: object): Promise<any> {
  const url = `${BASE_URL}${path}`;

  if (DRY_RUN) {
    console.log(`\n  [DRY RUN] POST ${path}`);
    console.log('  ' + JSON.stringify(body, null, 2).replace(/\n/g, '\n  '));
    // Return a fake ID so the script can keep running
    return { id: `dry-run-${Math.random().toString(36).slice(2, 8)}` };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status} ${res.statusText}\n${text}`);
  }

  const json = await res.json();
  return json.data ?? json;
}

async function get(path: string): Promise<any> {
  if (DRY_RUN) return { data: [] };
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Walks the paginated list looking for a source already registered for this
 * item under the profile's name. The list endpoint has no item filter, so the
 * match happens here.
 */
async function findExistingSource(name: string): Promise<{ id: string } | null> {
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const body = await get(`/api/v1/energy/source${qs}`);
    const rows: any[] = body.data ?? [];
    const hit = rows.find((r) => r.name === name && r.itemId === ITEM_ID);
    if (hit) return hit;
    cursor = body.pagination?.nextCursor ?? body.nextCursor;
    if (!cursor || rows.length === 0) return null;
  }
  return null;
}

/** Months already metered for a source, as `YYYY-MM` keys. */
async function existingMonths(sourceId: string): Promise<Set<string>> {
  const months = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ energySourceId: sourceId });
    if (cursor) qs.set('cursor', cursor);
    const body = await get(`/api/v1/energy/consumption?${qs}`);
    const rows: any[] = body.data ?? [];
    for (const r of rows) {
      if (r.energySourceId === sourceId) months.add(String(r.periodStart).slice(0, 7));
    }
    cursor = body.pagination?.nextCursor ?? body.nextCursor;
    if (!cursor || rows.length === 0) break;
  }
  return months;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateConfig() {
  const errors: string[] = [];
  if (!API_TOKEN) errors.push('API_TOKEN is required');
  if (!ITEM_ID) errors.push('ITEM_ID is required');
  if (isNaN(YEAR) || YEAR < 2000 || YEAR > 2100) errors.push(`YEAR="${process.env.YEAR}" is not a valid year`);
  if (errors.length) {
    console.error('\n❌ Configuration errors:');
    errors.forEach(e => console.error(`   • ${e}`));
    console.error('\nUsage:');
    console.error('   API_TOKEN=<token> ITEM_ID=<id> npx tsx scripts/simulate-bms.ts\n');
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  validateConfig();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     Datia BMS Simulation — Bloque 6 (EU ESPR/DPP)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n  BASE_URL  : ${BASE_URL}`);
  console.log(`  ITEM_ID   : ${ITEM_ID}`);
  console.log(`  YEAR      : ${YEAR}`);
  console.log(`  DRY_RUN   : ${DRY_RUN}`);
  console.log(`  PERFIL    : ${PROFILE.id} — ${PROFILE.generationTechnology}, ${PROFILE.renewableShare} % renovable`);
  console.log(`  Factor CO₂: ${EMISSION_FACTOR} kgCO₂e/kWh (${EMISSION_FACTOR_SOURCE})\n`);

  // ── Step 1: register energy source (once, reused across runs) ──────────
  console.log('── Paso 1: Registrar fuente de energía ────────────────');
  const sourceName = bmsSourceName(PROFILE, YEAR);
  const found = await findExistingSource(sourceName);
  let source: { id: string };
  if (found) {
    source = found;
    console.log(`  ♻️  Fuente ya existente, se reutiliza: ${source.id}\n`);
  } else {
    source = await post('/api/v1/energy/source', {
      name: sourceName,
      energyCarrier: PROFILE.energyCarrier,
      generationTechnology: PROFILE.generationTechnology,
      capacityKw: PROFILE.capacityKw ?? undefined,
      countryOfOrigin: 'ES',
      renewableShare: PROFILE.renewableShare,
      guaranteeOfOriginId: bmsGuaranteeOfOrigin(PROFILE, ITEM_ID, YEAR),
      gridEmissionFactor: EMISSION_FACTOR,
      itemId: ITEM_ID,
    });
    console.log(`  ✅ EnergySource: ${source.id}\n`);
  }

  const alreadyMetered = await existingMonths(source.id);
  if (alreadyMetered.size) {
    console.log(`  ♻️  ${alreadyMetered.size} mes(es) ya registrados, se omiten\n`);
  }

  // ── Step 2 & 3: 12 monthly readings ───────────────────────────────────
  console.log('── Paso 2+3: Lecturas mensuales + cálculo CO₂ ─────────\n');

  const results: Array<{
    month: string;
    kwh: number;
    co2eKg: number;
    consumptionId: string;
    emissionId: string;
  }> = [];

  let skipped = 0;

  for (let m = 0; m < 12; m++) {
    const monthKey = `${YEAR}-${String(m + 1).padStart(2, '0')}`;
    if (alreadyMetered.has(monthKey)) {
      skipped++;
      console.log(`  ${MONTH_NAMES[m].padEnd(12)} ${'—'.padStart(8)}       ya registrado, se omite`);
      continue;
    }

    const kwh = bmsMonthlyKwh(PROFILE, m);
    const co2eKg = parseFloat((kwh * EMISSION_FACTOR).toFixed(3));
    const periodStart = isoDate(YEAR, m, 1);
    const periodEnd = isoDate(YEAR, m + 1, 0); // last day of month

    // POST consumption
    const consumption = await post('/api/v1/energy/consumption', {
      energySourceId: source.id,
      periodStart,
      periodEnd,
      consumptionKwh: kwh,
      consumptionMj: parseFloat((kwh * 3.6).toFixed(2)),
      lifecycleStage: 'USE',
      measurementStandard: PROFILE.measurementStandard,
      operatingConditions: {
        profile: PROFILE.id,
        season: PROFILE.seasonal[m] >= 1.0 ? 'peak' : 'off-peak',
        // Sensor telemetry the BMS reports alongside the meter reading.
        ...bmsSensorReadings(PROFILE, m, kwh),
      },
    });

    // POST emission
    const emission = await post('/api/v1/emissions', {
      energyConsumptionId: consumption.id,
      co2eKg,
      scope: PROFILE.scope,
      systemBoundary: PROFILE.systemBoundary,
      emissionFactor: EMISSION_FACTOR,
      emissionFactorSource: EMISSION_FACTOR_SOURCE,
      calculationMethodology: PROFILE.calculationMethodology,
      gwpCharacterizationFactors: 'IPCC AR6',
      functionalUnit: 'kWh',
    });

    results.push({
      month: MONTH_NAMES[m],
      kwh,
      co2eKg,
      consumptionId: consumption.id,
      emissionId: emission.id,
    });

    const bar = '█'.repeat(Math.round(kwh / 500));
    console.log(`  ${MONTH_NAMES[m].padEnd(12)} ${String(kwh).padStart(8)} kWh  ${String(co2eKg).padStart(8)} kgCO₂e  ${bar}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const totalKwh = results.reduce((s, r) => s + r.kwh, 0);
  const totalCo2 = results.reduce((s, r) => s + r.co2eKg, 0);

  console.log('\n── Resumen anual ───────────────────────────────────────');
  console.log(`  Consumo total    : ${totalKwh.toFixed(2)} kWh`);
  console.log(`  Emisiones totales: ${totalCo2.toFixed(3)} kgCO₂e  (${(totalCo2 / 1000).toFixed(3)} tCO₂e)`);
  console.log(`  Fuente de energía: ${source.id}`);
  console.log(`  Registros creados: ${results.length} consumos + ${results.length} emisiones`);
  if (skipped) console.log(`  Meses omitidos   : ${skipped} (ya estaban registrados)`);

  if (!DRY_RUN) {
    console.log('\n── Siguiente paso: certificar una emisión ───────────────');
    console.log('  Para anclar una emisión en blockchain:');
    console.log(`\n  curl -X POST ${BASE_URL}/api/v1/emissions/<emissionId>/certify \\`);
    console.log(`    -H "Authorization: Bearer ${API_TOKEN.slice(0, 8)}..." \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"verifierBody":"AENOR","verificationStandard":"ISO 14064-3"}'`);
    console.log('\n  IDs de emisión disponibles:');
    results.slice(0, 3).forEach(r =>
      console.log(`    ${r.month.padEnd(12)} → ${r.emissionId}`)
    );
    if (results.length > 3) console.log(`    ... y ${results.length - 3} más`);
  }

  console.log('\n✅ Simulación completada.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
