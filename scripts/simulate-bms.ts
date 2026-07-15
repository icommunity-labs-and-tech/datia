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
 *   DRY_RUN    Print payloads, no calls  (default: unset)
 *
 * Usage:
 *   API_TOKEN=xxx ITEM_ID=yyy npx tsx scripts/simulate-bms.ts
 *   API_TOKEN=xxx ITEM_ID=yyy DRY_RUN=1 npx tsx scripts/simulate-bms.ts
 */

// ── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN ?? '';
const ITEM_ID = process.env.ITEM_ID ?? '';
const YEAR = parseInt(process.env.YEAR ?? String(new Date().getFullYear() - 1), 10);
const DRY_RUN = Boolean(process.env.DRY_RUN);

// IEA Spain 2023 grid emission factor for SCOPE_2 electricity (kgCO₂e/kWh)
const EMISSION_FACTOR = 0.233;
const EMISSION_FACTOR_SOURCE = 'IEA Spain 2023';

// Base monthly consumption (kWh) for a mid-size industrial asset
const BASE_KWH = 8_500;

// Seasonal multipliers — based on REE demand patterns for Spain
// Peaks in Jan/Feb (heating) and Jul/Aug (cooling)
const SEASONAL = [1.10, 1.05, 0.95, 0.88, 0.85, 0.92, 1.15, 1.12, 0.95, 0.90, 0.98, 1.08];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString();
}

// ±5 % random noise to make readings look real
function withNoise(value: number): number {
  return parseFloat((value * (0.95 + Math.random() * 0.10)).toFixed(2));
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
  console.log(`  Factor CO₂: ${EMISSION_FACTOR} kgCO₂e/kWh (${EMISSION_FACTOR_SOURCE})\n`);

  // ── Step 1: register energy source (once) ──────────────────────────────
  console.log('── Paso 1: Registrar fuente de energía ────────────────');
  const source = await post('/api/v1/energy/source', {
    name: `Red eléctrica — Simulación BMS ${YEAR}`,
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'Grid',
    countryOfOrigin: 'ES',
    gridEmissionFactor: EMISSION_FACTOR,
    itemId: ITEM_ID,
  });
  console.log(`  ✅ EnergySource: ${source.id}\n`);

  // ── Step 2 & 3: 12 monthly readings ───────────────────────────────────
  console.log('── Paso 2+3: Lecturas mensuales + cálculo CO₂ ─────────\n');

  const results: Array<{
    month: string;
    kwh: number;
    co2eKg: number;
    consumptionId: string;
    emissionId: string;
  }> = [];

  for (let m = 0; m < 12; m++) {
    const kwh = withNoise(BASE_KWH * SEASONAL[m]);
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
      measurementStandard: 'IEC 62053',
      operatingConditions: { season: SEASONAL[m] >= 1.0 ? 'peak' : 'off-peak' },
    });

    // POST emission
    const emission = await post('/api/v1/emissions', {
      energyConsumptionId: consumption.id,
      co2eKg,
      scope: 'SCOPE_2',
      systemBoundary: 'CRADLE_TO_GATE',
      emissionFactor: EMISSION_FACTOR,
      emissionFactorSource: EMISSION_FACTOR_SOURCE,
      calculationMethodology: 'GHG Protocol Corporate Standard',
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
