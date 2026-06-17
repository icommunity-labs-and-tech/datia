#!/usr/bin/env node
/**
 * Datia demo data seed — rich ESPR-aligned mock data
 * Creates 3 hardware assets, varied energy sources, 12 months of consumption,
 * and emission records covering multiple scopes and lifecycle stages.
 *
 * Run:     node scripts/seed-datia-demo.mjs
 * Re-run:  safe — skips existing records
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const d = (s) => new Date(s);

async function upsertItem(data) {
  const existing = await prisma.item.findUnique({ where: { id: data.id } });
  if (existing) { process.stdout.write(`  ⚠  Item ya existe: ${data.name}\n`); return existing; }
  const r = await prisma.item.create({ data: { ...data, updatedAt: new Date() } });
  process.stdout.write(`  ✅ Item: ${r.name}\n`);
  return r;
}

async function upsertSource(data) {
  const existing = await prisma.energySource.findFirst({ where: { itemId: data.itemId, name: data.name } });
  if (existing) { process.stdout.write(`  ⚠  Source ya existe: ${data.name}\n`); return existing; }
  const r = await prisma.energySource.create({ data: { ...data, updatedAt: new Date() } });
  process.stdout.write(`  ✅ EnergySource: ${r.name} (${r.energyCarrier})\n`);
  return r;
}

async function upsertConsumption(data) {
  const existing = await prisma.energyConsumption.findFirst({
    where: { energySourceId: data.energySourceId, periodStart: data.periodStart },
  });
  if (existing) return existing;
  return prisma.energyConsumption.create({ data });
}

async function upsertEmission(data) {
  const existing = await prisma.emissionRecord.findFirst({ where: { energyConsumptionId: data.energyConsumptionId } });
  if (existing) return existing;
  return prisma.emissionRecord.create({ data });
}

async function upsertState(data) {
  const existing = await prisma.state.findFirst({
    where: { itemId: data.itemId, statusTypeId: data.statusTypeId, title: data.title },
  });
  if (existing) return existing;
  return prisma.state.create({ data });
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Seeding Datia demo data (ESPR-aligned)\n');

  const org = await prisma.organization.findUnique({ where: { slug: 'datia' } });
  if (!org) { console.error('❌ Org "datia" not found. Run create-datia-org.mjs first'); process.exit(1); }
  console.log(`Org: ${org.nombre}\n`);

  // ── StatusType para certificación ────────────────────────────────────────
  let certST = await prisma.statusType.findFirst({ where: { organizationId: org.id, name: 'Certificación Energética' } });
  if (!certST) {
    certST = await prisma.statusType.create({
      data: {
        id: uid(), name: 'Certificación Energética',
        description: 'Huella de carbono certificada según ESPR / ISO 14067',
        template: [], organizationId: org.id, updatedAt: new Date(),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVO 1 — Instalación fotovoltaica
  // ══════════════════════════════════════════════════════════════════════════
  console.log('── Activo 1: Instalación Fotovoltaica ─────────────────────');
  const pv = await upsertItem({
    id: 'DATIA-PV-001',
    name: 'Instalación FV — Cubierta Nave A',
    description: '48 módulos monocristalinos 440 Wp. Inversor SolarEdge SE17K. Generación anual estimada: 22 MWh.',
    organizationId: org.id,
    templateFields: { manufacturer: 'SolarEdge', model: 'SE17K', serialNumber: 'SE-2023-00412', power_kwp: 21.12, modules: 48 },
  });

  const pvSource = await upsertSource({
    name: 'Generación solar cubierta nave A',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'photovoltaic_monocrystalline',
    capacityKw: 21.12,
    location: 'Cubierta nave A, Polígono Industrial Sur, Madrid',
    installationDate: d('2023-06-01'),
    renewableShare: 100,
    guaranteeOfOriginId: 'GO-ES-2023-PV-00412',
    countryOfOrigin: 'ES',
    gridEmissionFactor: 207,
    itemId: pv.id,
  });

  // 12 meses de generación fotovoltaica (kWh varía según estación)
  const pvMonths = [
    { m:'2023-07', kwh:2180.4 }, { m:'2023-08', kwh:2340.1 }, { m:'2023-09', kwh:1876.3 },
    { m:'2023-10', kwh:1243.6 }, { m:'2023-11', kwh: 742.8 }, { m:'2023-12', kwh: 498.2 },
    { m:'2024-01', kwh: 612.5 }, { m:'2024-02', kwh: 834.0 }, { m:'2024-03', kwh:1412.7 },
    { m:'2024-04', kwh:1834.9 }, { m:'2024-05', kwh:2098.3 }, { m:'2024-06', kwh:2276.6 },
  ];

  let pvConsumptions = [];
  for (const { m, kwh } of pvMonths) {
    const c = await upsertConsumption({
      energySourceId: pvSource.id,
      periodStart: d(`${m}-01`),
      periodEnd: d(`${m}-${new Date(`${m}-01`).toLocaleDateString('en',{month:'2-digit',day:'2-digit'}).slice(3)}`),
      consumptionKwh: kwh,
      consumptionMj: +(kwh * 3.6).toFixed(1),
      lifecycleStage: 'USE',
      measurementStandard: 'IEC 61724-1:2017',
      currency: 'EUR',
    });
    pvConsumptions.push({ c, kwh, m });
  }
  console.log(`  ✅ ${pvMonths.length} meses consumo FV`);

  // Emisiones scope 2 — todos VERIFIED excepto el último (PENDING)
  let pvEmissions = [];
  for (const [i, { c, kwh, m }] of pvConsumptions.entries()) {
    const isLast = i === pvConsumptions.length - 1;
    const co2e = +(kwh * 0.207).toFixed(3);
    const e = await upsertEmission({
      energyConsumptionId: c.id,
      co2eKg: co2e,
      scope: 'SCOPE_2',
      systemBoundary: 'CRADLE_TO_GATE',
      emissionFactor: 0.207,
      emissionFactorSource: 'IEA 2023 — Spain electricity grid',
      calculationMethodology: 'ISO 14067:2018',
      gwpCharacterizationFactors: 'IPCC AR6 GWP100',
      functionalUnit: '1 kWh generado neto',
      verificationStatus: isLast ? 'PENDING' : 'VERIFIED',
      verifierBody: isLast ? null : 'Bureau Veritas',
      verificationStandard: isLast ? null : 'ISO 14064-3:2019',
    });
    pvEmissions.push({ e, co2e, m, isLast });
    if (!isLast) {
      await upsertState({
        id: uid(),
        itemId: pv.id, statusTypeId: certST.id,
        title: `Certificación ${m} — ${co2e} kg CO₂e`,
        description: `Huella de carbono Scope 2, ${m}. Verificado por Bureau Veritas / ISO 14064-3.`,
        evidenceID: `demo-pv-${m}`,
        backed: true, backedAt: d(`${m}-28`),
        templateConfig: { co2eKg: co2e, scope: 'SCOPE_2', verifierBody: 'Bureau Veritas' },
      });
    }
  }
  console.log(`  ✅ ${pvEmissions.length} registros de emisión (${pvEmissions.length-1} VERIFIED, 1 PENDING)`);

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVO 2 — Cargadores EV
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Activo 2: Estación de Carga EV ────────────────────────');
  const ev = await upsertItem({
    id: 'DATIA-EV-001',
    name: 'Estación Carga EV — Parking B',
    description: '8 puntos de carga AC 22 kW + 2 puntos DC 150 kW. Gestión inteligente con balanceo de carga.',
    organizationId: org.id,
    templateFields: { manufacturer: 'Wallbox', model: 'Supernova', units_ac: 8, units_dc: 2, total_capacity_kw: 476 },
  });

  // Fuente 1: red eléctrica
  const evGrid = await upsertSource({
    name: 'Suministro red — Parking B',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'grid_mix',
    capacityKw: 476,
    location: 'Parking B, Cubierta -1',
    installationDate: d('2023-09-01'),
    renewableShare: 38,   // mix peninsular España
    countryOfOrigin: 'ES',
    gridEmissionFactor: 207,
    itemId: ev.id,
  });

  // Fuente 2: solar self-consumption alimentando los cargadores
  const evSolar = await upsertSource({
    name: 'Autoconsumo solar — Cargadores EV',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'photovoltaic_monocrystalline',
    capacityKw: 30,
    location: 'Cubierta parking B',
    installationDate: d('2024-01-15'),
    renewableShare: 100,
    guaranteeOfOriginId: 'GO-ES-2024-EV-00089',
    countryOfOrigin: 'ES',
    gridEmissionFactor: 0,
    itemId: ev.id,
  });

  const evMonths = [
    { m:'2024-01', grid:14230, solar:0 },
    { m:'2024-02', grid:13980, solar:420 },
    { m:'2024-03', grid:12540, solar:1840 },
    { m:'2024-04', grid:11200, solar:3120 },
    { m:'2024-05', grid:10340, solar:4280 },
    { m:'2024-06', grid: 9870, solar:5140 },
  ];

  let evEmissions = [];
  for (const { m, grid, solar } of evMonths) {
    const cGrid = await upsertConsumption({
      energySourceId: evGrid.id,
      periodStart: d(`${m}-01`),
      periodEnd: d(`${m}-28`),
      consumptionKwh: grid,
      consumptionMj: +(grid * 3.6).toFixed(1),
      lifecycleStage: 'USE',
      measurementStandard: 'IEC 62196-3',
      currency: 'EUR', costAmount: +(grid * 0.14).toFixed(2),
    });
    const co2Grid = +(grid * 0.207).toFixed(3);
    const eGrid = await upsertEmission({
      energyConsumptionId: cGrid.id,
      co2eKg: co2Grid, scope: 'SCOPE_2', systemBoundary: 'CRADLE_TO_GATE',
      emissionFactor: 0.207, emissionFactorSource: 'IEA 2023 — Spain electricity grid',
      calculationMethodology: 'ISO 14067:2018', gwpCharacterizationFactors: 'IPCC AR6 GWP100',
      functionalUnit: '1 kWh suministrado a vehículo',
      verificationStatus: 'VERIFIED', verifierBody: 'DNV', verificationStandard: 'ISO 14064-3:2019',
    });
    await upsertState({
      id: uid(), itemId: ev.id, statusTypeId: certST.id,
      title: `Cert. red ${m} — ${co2Grid} kg CO₂e`,
      description: `Consumo red ${m}. Scope 2. Verificado DNV.`,
      evidenceID: `demo-ev-grid-${m}`, backed: true, backedAt: d(`${m}-28`),
      templateConfig: { co2eKg: co2Grid, scope: 'SCOPE_2', verifierBody: 'DNV' },
    });
    evEmissions.push(eGrid);

    if (solar > 0) {
      const cSolar = await upsertConsumption({
        energySourceId: evSolar.id,
        periodStart: d(`${m}-01`), periodEnd: d(`${m}-28`),
        consumptionKwh: solar, consumptionMj: +(solar * 3.6).toFixed(1),
        lifecycleStage: 'USE', measurementStandard: 'IEC 61724-1:2017',
      });
      const co2Solar = 0; // 100% renovable
      const eSolar = await upsertEmission({
        energyConsumptionId: cSolar.id,
        co2eKg: co2Solar, scope: 'SCOPE_2', systemBoundary: 'CRADLE_TO_GATE',
        emissionFactor: 0, emissionFactorSource: 'Autoconsumo solar certificado GO',
        calculationMethodology: 'ISO 14067:2018', gwpCharacterizationFactors: 'IPCC AR6 GWP100',
        functionalUnit: '1 kWh solar autoconsumido',
        verificationStatus: 'VERIFIED', verifierBody: 'DNV', verificationStandard: 'ISO 14064-3:2019',
      });
      evEmissions.push(eSolar);
    }
  }
  console.log(`  ✅ ${evMonths.length} meses consumo EV (grid + solar)`);
  console.log(`  ✅ ${evEmissions.length} registros de emisión VERIFIED`);

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVO 3 — Aerogenerador
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Activo 3: Aerogenerador ────────────────────────────────');
  const wind = await upsertItem({
    id: 'DATIA-WIND-001',
    name: 'Aerogenerador — Parque Eólico Norte',
    description: 'Turbina Vestas V150-4.5 MW. Altura de buje 105m. Factor de capacidad estimado 38%.',
    organizationId: org.id,
    templateFields: { manufacturer: 'Vestas', model: 'V150-4.5', power_mw: 4.5, hub_height_m: 105, rotor_diameter_m: 150 },
  });

  const windSource = await upsertSource({
    name: 'Generación eólica turbina V150',
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'wind_onshore',
    capacityKw: 4500,
    location: 'Parque Eólico Norte, Burgos',
    installationDate: d('2022-11-15'),
    renewableShare: 100,
    guaranteeOfOriginId: 'GO-ES-2022-WIND-00017',
    countryOfOrigin: 'ES',
    gridEmissionFactor: 7, // lifecycle emissions wind
    itemId: wind.id,
  });

  // Scope 3 — emisiones de fabricación e instalación
  const windMfg = await upsertConsumption({
    energySourceId: windSource.id,
    periodStart: d('2022-06-01'), periodEnd: d('2022-11-14'),
    consumptionKwh: 3_420_000, consumptionMj: +(3_420_000 * 3.6).toFixed(1),
    lifecycleStage: 'MANUFACTURING',
    measurementStandard: 'EN ISO 14040 / 14044',
  });
  const windMfgEmission = await upsertEmission({
    energyConsumptionId: windMfg.id,
    co2eKg: 23940, scope: 'SCOPE_3', systemBoundary: 'CRADLE_TO_GATE',
    emissionFactor: 0.007, emissionFactorSource: 'Vestas EPD 2022 / IEA Wind LCA',
    calculationMethodology: 'ISO 14067:2018 + GHG Protocol Scope 3',
    gwpCharacterizationFactors: 'IPCC AR6 GWP100',
    functionalUnit: '1 turbina instalada',
    verificationStatus: 'VERIFIED', verifierBody: 'SGS', verificationStandard: 'ISO 14064-3:2019',
  });
  await upsertState({
    id: uid(), itemId: wind.id, statusTypeId: certST.id,
    title: 'Certificación fabricación — 23.940 kg CO₂e',
    description: 'Huella de carbono Scope 3 fase de fabricación e instalación. Verificado SGS.',
    evidenceID: 'demo-wind-mfg', backed: true, backedAt: d('2022-11-30'),
    templateConfig: { co2eKg: 23940, scope: 'SCOPE_3', systemBoundary: 'CRADLE_TO_GATE', verifierBody: 'SGS' },
  });

  // USE — 12 meses operación
  const windUseMonths = [
    { m:'2023-01', kwh:2_840_000 }, { m:'2023-02', kwh:3_120_000 },
    { m:'2023-03', kwh:2_560_000 }, { m:'2023-04', kwh:1_980_000 },
    { m:'2023-05', kwh:1_720_000 }, { m:'2023-06', kwh:1_340_000 },
    { m:'2023-07', kwh:1_180_000 }, { m:'2023-08', kwh:1_420_000 },
    { m:'2023-09', kwh:2_080_000 }, { m:'2023-10', kwh:2_640_000 },
    { m:'2023-11', kwh:3_040_000 }, { m:'2023-12', kwh:3_280_000 },
  ];

  let windEmissions = [];
  for (const [i, { m, kwh }] of windUseMonths.entries()) {
    const isLast = i === windUseMonths.length - 1;
    const c = await upsertConsumption({
      energySourceId: windSource.id,
      periodStart: d(`${m}-01`), periodEnd: d(`${m}-28`),
      consumptionKwh: kwh, consumptionMj: +(kwh * 3.6).toFixed(1),
      lifecycleStage: 'USE', measurementStandard: 'IEC 61400-26-1',
    });
    const co2e = +(kwh * 0.007).toFixed(1);
    const e = await upsertEmission({
      energyConsumptionId: c.id,
      co2eKg: co2e, scope: 'SCOPE_1', systemBoundary: 'GATE_TO_GATE',
      emissionFactor: 0.007, emissionFactorSource: 'Vestas EPD 2022',
      calculationMethodology: 'ISO 14067:2018', gwpCharacterizationFactors: 'IPCC AR6 GWP100',
      functionalUnit: '1 kWh generado bruto',
      verificationStatus: isLast ? 'PENDING' : 'VERIFIED',
      verifierBody: isLast ? null : 'SGS',
      verificationStandard: isLast ? null : 'ISO 14064-3:2019',
    });
    if (!isLast) {
      await upsertState({
        id: uid(), itemId: wind.id, statusTypeId: certST.id,
        title: `Cert. operación ${m} — ${co2e} kg CO₂e`,
        description: `Operación aerogenerador ${m}. Scope 1 lifecycle. Verificado SGS.`,
        evidenceID: `demo-wind-${m}`, backed: true, backedAt: d(`${m}-28`),
        templateConfig: { co2eKg: co2e, scope: 'SCOPE_1', verifierBody: 'SGS' },
      });
    }
    windEmissions.push({ e, m, isLast });
  }
  console.log(`  ✅ 1 emisión Scope 3 (fabricación) + ${windUseMonths.length} meses USE`);

  // ── API token ─────────────────────────────────────────────────────────────
  const RAW_TOKEN = 'datia-demo-token-2024';
  const tokenHash = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex');
  const existingTok = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!existingTok) {
    await prisma.apiToken.create({ data: { id: uid(), name: 'Demo token', tokenHash, organizationId: org.id } });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalSources = await prisma.energySource.count({ where: { Item: { organizationId: org.id } } });
  const totalConsumptions = await prisma.energyConsumption.count({ where: { EnergySource: { Item: { organizationId: org.id } } } });
  const totalEmissions = await prisma.emissionRecord.count({ where: { EnergyConsumption: { EnergySource: { Item: { organizationId: org.id } } } } });
  const pendingEmissions = await prisma.emissionRecord.count({ where: { verificationStatus: 'PENDING', EnergyConsumption: { EnergySource: { Item: { organizationId: org.id } } } } });

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('📊 DATOS EN BD');
  console.log(`   Items (hardware):       3`);
  console.log(`   Fuentes de energía:     ${totalSources} (solar FV, red, autoconsumo solar, eólica)`);
  console.log(`   Registros de consumo:   ${totalConsumptions}`);
  console.log(`   Registros de emisión:   ${totalEmissions} (${totalEmissions - pendingEmissions} VERIFIED, ${pendingEmissions} PENDING)`);
  console.log(`   Scopes cubiertos:       SCOPE_1 (eólica operación), SCOPE_2 (red), SCOPE_3 (fabricación)`);
  console.log(`   Etapas ciclo de vida:   MANUFACTURING, USE`);
  console.log(`   Estándares:             ISO 14067:2018, IEC 61724, IEC 62196, IEC 61400`);
  console.log(`   Verificadores:          Bureau Veritas, DNV, SGS`);
  console.log('\n📋 ACCESO');
  console.log('   Login:   http://localhost:3000/org/datia/admin');
  console.log('   User:    admin@datia.icommunitylabs.com / datia-dev-2024');
  console.log('\n🔗 URLS DASHBOARD');
  console.log('   /dashboard/energy/sources      — 4 fuentes ESPR');
  console.log('   /dashboard/energy/consumption  — consumos por fuente y etapa');
  console.log('   /dashboard/energy/emissions    — emisiones multi-scope');
  console.log('\n🌐 PORTAL PÚBLICO (activos con certif. ancladas)');
  console.log('   http://localhost:3000/customer/item/DATIA-PV-001');
  console.log('   http://localhost:3000/customer/item/DATIA-EV-001');
  console.log('   http://localhost:3000/customer/item/DATIA-WIND-001');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Seed completado\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
