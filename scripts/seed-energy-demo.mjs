/**
 * Demo seed: energy sources, consumption (12 months) and emissions for default-org-id.
 * Safe to re-run: clears only the sources created by this script (identified by name prefix).
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const ORG_ID = 'default-org-id';

// Items from this org to attach sources to (solar + energy equipment)
const ITEM_IDS = [
  '049043d4-a18c-4986-8829-bbd812319680', // Paneles Canadian Solar - Instancia 2
  '082f8925-06d1-441b-93c4-10cb2a6a52c2', // Paneles Aiko - Instancia 3
  '0e2eb190-e2a5-4dd4-aa9f-909939ed5454', // Enphase Microinversores - Instancia 4
  '0f5d4847-3afd-4673-8c30-f7b23d559746', // Sistema Aerotermia - Instancia 2
  '17af997b-0e05-41de-992e-d1e2e48cc68f', // Sonnen Battery - Instancia 2
  '082f8925-06d1-441b-93c4-10cb2a6a52c2', // reuse for 6th source
];

const SOURCES = [
  {
    name: '[DEMO] Instalación Solar FV — Sevilla',
    energyCarrier: 'SOLAR_THERMAL',
    generationTechnology: 'photovoltaic',
    capacityKw: 280,
    latitude: 37.3886,
    longitude: -5.9823,
    location: 'Polígono Industrial San Jerónimo, Sevilla',
    renewableShare: 100,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.02,
    guaranteeOfOriginId: 'GO-ES-2025-001847',
    // monthly kWh: high summer, low winter (GHI Sevilla)
    monthlyKwh: [9800, 11200, 14500, 18200, 22100, 24800, 26400, 25100, 19800, 14600, 9200, 7800],
    emissionFactor: 0.02,
    scope: 'SCOPE_2',
  },
  {
    name: '[DEMO] Red Eléctrica — Planta Madrid',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: null,
    capacityKw: 320,
    latitude: 40.4168,
    longitude: -3.7038,
    location: 'Parque Empresarial Las Rozas, Madrid',
    renewableShare: 75,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.233,
    guaranteeOfOriginId: null,
    // relatively flat, slightly higher winter (HVAC)
    monthlyKwh: [28400, 26800, 25100, 23600, 22800, 21400, 20900, 21200, 22800, 25300, 27100, 29600],
    emissionFactor: 0.233,
    scope: 'SCOPE_2',
  },
  {
    name: '[DEMO] Bomba Calor Aerotermia — Barcelona',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'heat_pump',
    capacityKw: 45,
    latitude: 41.3851,
    longitude: 2.1734,
    location: 'Zona Franca, Barcelona',
    renewableShare: 75,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.233,
    guaranteeOfOriginId: null,
    // HVAC: high summer + winter, low spring/autumn
    monthlyKwh: [4200, 3800, 2900, 2100, 1800, 2400, 3900, 3700, 2600, 2000, 3100, 4400],
    emissionFactor: 0.233,
    scope: 'SCOPE_2',
  },
  {
    name: '[DEMO] Instalación Solar FV — Almería',
    energyCarrier: 'SOLAR_THERMAL',
    generationTechnology: 'photovoltaic',
    capacityKw: 420,
    latitude: 36.834,
    longitude: -2.4637,
    location: 'Campo Solar Níjar, Almería',
    renewableShare: 100,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.02,
    guaranteeOfOriginId: 'GO-ES-2025-002193',
    // Almería: highest irradiation in Spain
    monthlyKwh: [11200, 13400, 18600, 24100, 29800, 33200, 35600, 33900, 26400, 18100, 11800, 9600],
    emissionFactor: 0.02,
    scope: 'SCOPE_2',
  },
  {
    name: '[DEMO] Gas Natural — Calefacción Valencia',
    energyCarrier: 'NATURAL_GAS',
    generationTechnology: 'gas_boiler',
    capacityKw: 120,
    latitude: 39.4699,
    longitude: -0.3763,
    location: 'Polígono Industrial Fuente del Jarro, Valencia',
    renewableShare: 0,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.202,
    guaranteeOfOriginId: null,
    // gas heating: high winter, minimal summer
    monthlyKwh: [18600, 16400, 12200, 6800, 3100, 1200, 800, 900, 2800, 7400, 13100, 17800],
    emissionFactor: 0.202,
    scope: 'SCOPE_1',
  },
  {
    name: '[DEMO] Batería Almacenamiento Solar — Málaga',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'battery_storage',
    capacityKw: 80,
    latitude: 36.7213,
    longitude: -4.4213,
    location: 'Parque Tecnológico de Andalucía, Málaga',
    renewableShare: 92,
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0.045,
    guaranteeOfOriginId: 'GO-ES-2025-003041',
    // follows solar profile (charged from solar)
    monthlyKwh: [5200, 6100, 8400, 10800, 13400, 15200, 16100, 15300, 11900, 8200, 5400, 4400],
    emissionFactor: 0.045,
    scope: 'SCOPE_2',
  },
];

async function main() {
  console.log('🌱 Seeding demo energy data...');

  // ── Clean previous demo sources ───────────────────────────────────────────
  const existing = await prisma.energySource.findMany({
    where: { name: { startsWith: '[DEMO]' }, Item: { organizationId: ORG_ID } },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log(`  ♻️  Removing ${existing.length} existing demo sources...`);
    await prisma.energySource.deleteMany({
      where: { id: { in: existing.map((s) => s.id) } },
    });
  }

  // ── Build 12-month period windows (Aug 2025 → Jul 2026) ──────────────────
  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2025, 7 + i, 1); // Aug 2025 = index 0
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  });

  // ── Create each source with consumption + emissions ───────────────────────
  for (let idx = 0; idx < SOURCES.length; idx++) {
    const def = SOURCES[idx];
    const itemId = ITEM_IDS[idx];

    const source = await prisma.energySource.create({
      data: {
        name: def.name,
        energyCarrier: def.energyCarrier,
        generationTechnology: def.generationTechnology,
        capacityKw: def.capacityKw,
        latitude: def.latitude,
        longitude: def.longitude,
        location: def.location,
        renewableShare: def.renewableShare,
        countryOfOrigin: def.countryOfOrigin,
        gridEmissionFactor: def.gridEmissionFactor,
        guaranteeOfOriginId: def.guaranteeOfOriginId,
        itemId,
      },
    });

    console.log(`  ✅ Created: ${def.name}`);

    // 12 months of consumption + 1 emission record each
    for (let m = 0; m < 12; m++) {
      const { start, end } = periods[m];
      // slight random variation ±5%
      const kwh = def.monthlyKwh[m] * (0.95 + Math.random() * 0.1);

      const consumption = await prisma.energyConsumption.create({
        data: {
          energySourceId: source.id,
          periodStart: start,
          periodEnd: end,
          consumptionKwh: Math.round(kwh),
          consumptionMj: Math.round(kwh * 3.6),
          lifecycleStage: 'USE',
          measurementStandard: 'ISO 50001',
          currency: 'EUR',
        },
      });

      const co2eKg = kwh * def.emissionFactor;
      const isVerified = m < 10; // last 2 months pending

      await prisma.emissionRecord.create({
        data: {
          energyConsumptionId: consumption.id,
          co2eKg: parseFloat(co2eKg.toFixed(2)),
          scope: def.scope,
          systemBoundary: 'CRADLE_TO_GATE',
          emissionFactor: def.emissionFactor,
          emissionFactorSource: 'IEA Spain 2023',
          calculationMethodology: 'GHG Protocol',
          gwpCharacterizationFactors: 'IPCC AR6',
          functionalUnit: '1 kWh',
          verificationStatus: isVerified ? 'VERIFIED' : 'PENDING',
          verifierBody: isVerified ? 'Bureau Veritas' : null,
        },
      });
    }
  }

  // Summary
  const totalKwh = SOURCES.reduce((s, d) => s + d.monthlyKwh.reduce((a, b) => a + b, 0), 0);
  const totalCo2 = SOURCES.reduce(
    (s, d) => s + d.monthlyKwh.reduce((a, b) => a + b, 0) * d.emissionFactor,
    0
  );
  console.log(`\n🎉 Done!`);
  console.log(`   6 energy sources, 72 consumption records, 72 emission records`);
  console.log(`   Total annual kWh: ${(totalKwh / 1000).toFixed(1)} MWh`);
  console.log(`   Total annual CO₂e: ${(totalCo2 / 1000).toFixed(2)} tCO₂e`);
  console.log(`\n   Login: pablocumpian@gmail.com  (org: default-org-id)`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
