#!/usr/bin/env node
/**
 * Extends the simulated sources into 2026.
 *
 * The BMS simulator was only ever run over 2025, so four sources carry a year of
 * daily readings and then stop dead. On a monthly chart that shows as a cliff —
 * 48 000 kWh in December against 11 000 in January — which is an artefact of when
 * the demo was generated, not something that happened.
 *
 * Readings are monthly here rather than daily: the dashboard plots energy and
 * carbon, not record counts, so a thousand daily rows would cost a great deal to
 * certify and change nothing on screen.
 *
 * The emissions are left pending on purpose. They are anchored afterwards by the
 * ordinary sweep, through the same path a real record follows.
 *
 * Idempotent: a month already present is left alone.
 *
 * Run with: node scripts/backfill-2026-readings.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const ORG_SLUG = 'datia';
const YEAR = 2026;

/** Only months that have already closed: no inventing the future. */
const LAST_MONTH_INDEX = new Date().getUTCMonth() - 1;

// Same shape the simulator uses, so the extension is continuous with what came
// before rather than a different-looking series glued on.
const PROFILES = {
  grid: {
    emissionFactor: 0.233,
    emissionFactorSource: 'IEA Spain 2023',
    scope: 'SCOPE_2',
    systemBoundary: 'CRADLE_TO_GATE',
    calculationMethodology: 'GHG Protocol Corporate Standard',
    measurementStandard: 'IEC 62053',
    baseKwh: 8_500,
    seasonal: [1.10, 1.05, 0.95, 0.88, 0.85, 0.92, 1.15, 1.12, 0.95, 0.90, 0.98, 1.08],
  },
  solar: {
    emissionFactor: 0.041,
    emissionFactorSource: 'IPCC AR6 · ciclo de vida fotovoltaico',
    scope: 'SCOPE_3',
    systemBoundary: 'CRADLE_TO_GRAVE',
    calculationMethodology: 'ISO 14067',
    measurementStandard: 'IEC 61724-1',
    baseKwh: 6_200,
    seasonal: [0.42, 0.55, 0.78, 0.92, 1.08, 1.20, 1.24, 1.14, 0.94, 0.68, 0.47, 0.38],
  },
};

const round = (v, d = 2) => parseFloat(v.toFixed(d));

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`No existe la organización "${ORG_SLUG}"`);

  // The sources the simulator produced: they are the ones that stop at 2025.
  const sources = await prisma.energySource.findMany({
    where: { Item: { organizationId: org.id }, name: { contains: 'Simulación BMS' } },
    select: { id: true, name: true, _count: { select: { EnergyConsumption: true } } },
  });

  const dense = sources.filter((s) => s._count.EnergyConsumption > 100);
  console.log(`  fuentes a extender: ${dense.length}`);

  let creados = 0;
  let omitidos = 0;

  for (const source of dense) {
    const profile = source.name.toLowerCase().includes('fotovoltaico')
      ? PROFILES.solar
      : PROFILES.grid;

    for (let month = 0; month <= LAST_MONTH_INDEX; month++) {
      const periodStart = new Date(Date.UTC(YEAR, month, 1));
      const periodEnd = new Date(Date.UTC(YEAR, month + 1, 0, 23, 59, 59));

      const existing = await prisma.energyConsumption.findFirst({
        where: { energySourceId: source.id, periodStart },
        select: { id: true },
      });
      if (existing) {
        omitidos++;
        continue;
      }

      const kwh = round(profile.baseKwh * profile.seasonal[month] * (0.94 + Math.random() * 0.12));
      const co2eKg = round(kwh * profile.emissionFactor, 3);

      const consumption = await prisma.energyConsumption.create({
        data: {
          energySourceId: source.id,
          periodStart,
          periodEnd,
          consumptionKwh: kwh,
          consumptionMj: round(kwh * 3.6),
          lifecycleStage: 'USE',
          measurementStandard: profile.measurementStandard,
          operatingConditions: { granularity: 'monthly', backfill: true },
          createdAt: periodEnd,
        },
        select: { id: true },
      });

      await prisma.emissionRecord.create({
        data: {
          energyConsumptionId: consumption.id,
          co2eKg,
          scope: profile.scope,
          systemBoundary: profile.systemBoundary,
          emissionFactor: profile.emissionFactor,
          emissionFactorSource: profile.emissionFactorSource,
          calculationMethodology: profile.calculationMethodology,
          gwpCharacterizationFactors: 'IPCC AR6',
          functionalUnit: 'kWh',
          createdAt: periodEnd,
        },
      });

      creados++;
    }
  }

  console.log(`  lecturas creadas : ${creados}`);
  console.log(`  meses ya presentes: ${omitidos}`);
  console.log('\n  quedan pendientes de anclar: las recoge el barrido habitual');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
