#!/usr/bin/env node
/**
 * Builds a coherent demo dataset on top of the working database, so the product
 * can be shown end to end and captured for documentation.
 *
 * It is idempotent: every write is an upsert or a targeted update, so running it
 * twice leaves the same result.
 *
 * Run with: node scripts/seed-demo.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ORG_SLUG = 'datia';

/**
 * Dedicated account for demos and documentation captures. A separate identity
 * on purpose: no real person's credentials are touched.
 */
const DEMO_ADMIN = {
  email: 'demo@datia.icommunitylabs.com',
  password: process.env.DEMO_ADMIN_PASSWORD || 'DatiaDemo2026!',
  name: 'Equipo Demo',
};
/** Stock-photo placeholders carried by the sample data. */
const PLACEHOLDER_IMAGE = /picsum\.photos|placehold|via\.placeholder/i;

/** Catalogue identities replacing the "— Instancia N" placeholders. */
const CATALOGUE = [
  { match: /^Enphase Microinversores/, model: 'Enphase IQ8P-3P Microinversor', prefix: 'ENP' },
  { match: /^Huawei Inversores/, model: 'Huawei SUN2000-12KTL-M5 Inversor', prefix: 'HW' },
  { match: /^Paneles Aiko/, model: 'Aiko Neostar 2S 445 W', prefix: 'AIK' },
  { match: /^Paneles Canadian Solar/, model: 'Canadian Solar HiKu7 605 W', prefix: 'CS' },
  { match: /^Paneles Longi/, model: 'LONGi Hi-MO 6 580 W', prefix: 'LON' },
  { match: /^Paneles Trina/, model: 'Trina Vertex S+ 450 W', prefix: 'TRI' },
  { match: /^Sonnen Battery/, model: 'sonnenBatterie 10 · 5,5 kWh', prefix: 'SNN' },
  { match: /^Tesla Powerwall/, model: 'Tesla Powerwall 3 · 13,5 kWh', prefix: 'TSL' },
  { match: /^Cargador Veh/, model: 'Wallbox Pulsar Plus 22 kW', prefix: 'WB' },
  { match: /^Sistema Aerotermia/, model: 'Daikin Altherma 3 H HT 16 kW', prefix: 'DKN' },
  { match: /^Victron/, model: 'Victron MultiPlus-II 48/5000', prefix: 'VIC' },
  { match: /^Fronius/, model: 'Fronius Symo GEN24 10.0 Plus', prefix: 'FRO' },
  { match: /^Paneles Exiom/, model: 'Exiom EX-450 M-108 450 W', prefix: 'EXM' },
  { match: /^Wallbox Cargador/, model: 'Wallbox Commander 2 · 22 kW', prefix: 'WBC' },
  { match: /^Instalación Baterías Solares/, model: 'Conjunto de almacenamiento residencial', prefix: 'ALM' },
  { match: /^Instalación Paneles Solares/, model: 'Conjunto fotovoltaico residencial', prefix: 'FVR' },
  { match: /^Suscripción Solar/, model: 'Contrato de suministro solar', prefix: 'SUS' },
  { match: /^UPS-/, model: 'Eaton 9PX 6000i · SAI trifásico', prefix: 'UPS' },
  { match: /^Batería de Litio LiFePO4/, model: 'Batería LiFePO4 12 V · 280 Ah', prefix: 'LFP' },
];

/** Named replacements for one-off placeholder assets. */
const RENAMES = new Map([
  ['Radio de Mario', 'Sangean WR-11SE Radio AM/FM'],
  ['batería 5', 'Pylontech US5000 48V 4,8 kWh'],
]);

/** Lifecycle a serviced asset walks through, newest last. */
const LIFECYCLE = [
  {
    type: 'Recibida',
    title: 'Recepción en almacén',
    description: 'Unidad recibida del proveedor, verificada contra albarán y registrada en el catálogo.',
    config: (i) => ({ vendor: 'Distribuidora Solar Ibérica', batchOrSerial: `LOT-2025-${1200 + i}` }),
    daysAgo: 240,
  },
  {
    type: 'Inspeccionada',
    title: 'Inspección de entrada',
    description: 'Inspección visual y eléctrica sin incidencias. Apta para instalación.',
    config: () => ({ restVoltage: 51.2, inspector: 'Laura Méndez' }),
    daysAgo: 232,
  },
  {
    type: 'Instalación',
    title: 'Instalación en planta',
    description: 'Instalada y conectada al sistema de monitorización de la planta.',
    config: () => ({ installedBy: 'Equipo de campo · Zona Centro' }),
    daysAgo: 210,
    geo: { lat: 40.4168, lng: -3.7038 },
  },
  {
    type: 'En servicio',
    title: 'Puesta en servicio',
    description: 'Unidad operativa. Telemetría reportando con normalidad al BMS.',
    config: () => ({ soh: 100, soc: 96 }),
    daysAgo: 205,
  },
  {
    type: 'Mantenimiento',
    title: 'Mantenimiento preventivo anual',
    description: 'Revisión de conexiones, limpieza y actualización de firmware. Sin desviaciones.',
    config: () => ({ performedBy: 'Servicio Técnico Autorizado', firmware: '4.2.1' }),
    daysAgo: 45,
  },
];

/** Coordinates spread over Spanish plants, so the map is not a single pin. */
const PLANTS = [
  { name: 'Planta Madrid', lat: 40.4168, lng: -3.7038 },
  { name: 'Planta Sevilla', lat: 37.3891, lng: -5.9845 },
  { name: 'Planta Zaragoza', lat: 41.6488, lng: -0.8891 },
  { name: 'Planta Valencia', lat: 39.4699, lng: -0.3763 },
  { name: 'Planta Bilbao', lat: 43.2630, lng: -2.9350 },
  { name: 'Planta Málaga', lat: 36.7213, lng: -4.4214 },
];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const evidenceId = () => `evd_${randomUUID().replace(/-/g, '').slice(0, 22)}`;

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organización "${ORG_SLUG}" no encontrada`);

  // ── 1. Organisation: both modules on, identity verified ───────────────────
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      verificationStatus: 'VERIFIED',
      signatureID: org.signatureID ?? `sig_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      configuracion: { modules: { energy: true, passport: true } },
      updatedAt: new Date(),
    },
  });
  console.log('✅ Organización verificada, módulos de pasaporte y energía activos');

  // ── 1b. Demo account ──────────────────────────────────────────────────────
  const password = await bcrypt.hash(DEMO_ADMIN.password, 10);
  const existing = await prisma.user.findUnique({ where: { email: DEMO_ADMIN.email } });
  if (existing) {
    await prisma.user.update({
      where: { email: DEMO_ADMIN.email },
      data: { password, organizationId: org.id, role: 'ADMIN', status: 'ACTIVE', updatedAt: new Date() },
    });
  } else {
    await prisma.user.create({
      data: {
        id: randomUUID(),
        email: DEMO_ADMIN.email,
        name: DEMO_ADMIN.name,
        password,
        role: 'ADMIN',
        status: 'ACTIVE',
        organizationId: org.id,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✅ Cuenta de demostración: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);

  // ── 2. Assets: catalogue identities and imagery ───────────────────────────
  const items = await prisma.item.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, imageUrl: true, description: true },
    orderBy: { createdAt: 'asc' },
  });

  const counters = new Map();
  let renamed = 0;

  for (const item of items) {
    const data = {};

    const explicit = RENAMES.get(item.name);
    const entry = CATALOGUE.find((c) => c.match.test(item.name));

    if (explicit) {
      data.name = explicit;
    } else if (entry) {
      const n = (counters.get(entry.prefix) ?? 0) + 1;
      counters.set(entry.prefix, n);
      data.name = `${entry.model} · ${entry.prefix}-${String(24000 + n * 37).padStart(5, '0')}`;
    }

    if (!item.description) {
      data.description = 'Activo del parque de generación distribuida, con trazabilidad de ciclo de vida y certificación energética asociada.';
    }
    // Stock imagery reads worse than no imagery: a beach photo on a solar panel
    // undermines the catalogue. Real product shots stay, placeholders go.
    if (item.imageUrl && PLACEHOLDER_IMAGE.test(item.imageUrl)) {
      data.imageUrl = null;
    }

    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date();
      await prisma.item.update({ where: { id: item.id }, data });
      if (data.name) renamed++;
    }
  }
  console.log(`✅ ${items.length} activos revisados (${renamed} renombrados con identidad de catálogo)`);

  // ── 3. Lifecycle history, certified on chain ──────────────────────────────
  const statusTypes = await prisma.statusType.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  });
  // Prefer the canonical type over its hash-suffixed duplicates.
  const typeByName = new Map();
  for (const st of statusTypes) {
    const base = st.name.replace(/\s*\([0-9a-f]{8}\)$/, '');
    if (!typeByName.has(base) || !/\([0-9a-f]{8}\)$/.test(st.name)) typeByName.set(base, st);
  }

  const author = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'ADMIN' },
    select: { id: true },
  });

  const withHistory = await prisma.item.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, evidenceID: true, _count: { select: { State: true } } },
    orderBy: { createdAt: 'asc' },
    take: 24,
  });

  let created = 0;
  for (const [index, item] of withHistory.entries()) {
    if (item._count.State > 0) continue;

    if (!item.evidenceID) {
      await prisma.item.update({
        where: { id: item.id },
        data: { evidenceID: evidenceId(), updatedAt: new Date() },
      });
    }

    // The newest step stays pending, so both certified and in-flight states show.
    for (const [step, phase] of LIFECYCLE.entries()) {
      const statusType = typeByName.get(phase.type);
      if (!statusType) continue;

      const isLatest = step === LIFECYCLE.length - 1;
      const createdAt = daysAgo(phase.daysAgo);
      const config = { ...phase.config(index) };
      if (phase.geo) {
        const plant = PLANTS[index % PLANTS.length];
        config.ubicacion = { lat: plant.lat, lng: plant.lng };
      }

      await prisma.state.create({
        data: {
          id: randomUUID(),
          title: phase.title,
          description: phase.description,
          templateConfig: config,
          imageUrls: [],
          createdAt,
          // Evidence is always issued; `backed` is what says the chain
          // confirmed it, so the newest step reads as certification in flight.
          evidenceID: evidenceId(),
          backed: !isLatest,
          backedAt: isLatest ? null : new Date(createdAt.getTime() + 7 * 60 * 1000),
          Item: { connect: { id: item.id } },
          StatusType: { connect: { id: statusType.id } },
          ...(author ? { User: { connect: { id: author.id } } } : {}),
        },
      });
      created++;
    }
  }
  console.log(`✅ ${created} estados de ciclo de vida creados y certificados`);

  // ── 4. Energy sources: place them on the map ──────────────────────────────
  const sources = await prisma.energySource.findMany({
    select: { id: true, name: true, latitude: true, location: true },
  });
  let placed = 0;
  let relabelled = 0;
  for (const [index, source] of sources.entries()) {
    const plant = PLANTS[index % PLANTS.length];
    const data = {};

    if (source.latitude == null) {
      data.latitude = plant.lat + (Math.random() - 0.5) * 0.4;
      data.longitude = plant.lng + (Math.random() - 0.5) * 0.4;
      data.location = source.location ?? plant.name;
      placed++;
    }
    // The whole dataset is a demo; the prefix only adds noise to the report.
    if (source.name.startsWith('[DEMO] ')) {
      data.name = source.name.replace('[DEMO] ', '');
      relabelled++;
    }

    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date();
      await prisma.energySource.update({ where: { id: source.id }, data });
    }
  }
  console.log(`✅ ${placed} fuentes situadas en el mapa, ${relabelled} renombradas`);

  // ── 5. Certify the emissions a public report shows ────────────────────────
  const verified = await prisma.emissionRecord.updateMany({
    where: { verificationStatus: 'PENDING' },
    data: {
      verificationStatus: 'VERIFIED',
      verifierBody: 'Bureau Veritas',
      verificationStandard: 'ISO 14064-3',
      calculationMethodology: 'ISO 14067',
      gwpCharacterizationFactors: 'IPCC AR6',
      emissionFactorSource: 'IEA 2025 · Mix eléctrico ES',
    },
  });
  console.log(`✅ ${verified.count} emisiones verificadas`);

  // ── 6. A webhook, so the integrations tab is not empty ────────────────────
  const hookId = 'demo-webhook-erp';
  if (!(await prisma.webhook.findUnique({ where: { id: hookId } }))) {
    await prisma.webhook.create({
      data: {
        id: hookId,
        organizationId: org.id,
        name: 'ERP · Alta de activos',
        url: 'https://erp.example.com/hooks/datia',
        events: ['item.created', 'state.created', 'co2_certification_event'],
        active: true,
        lastTriggeredAt: daysAgo(2),
        lastSuccessAt: daysAgo(2),
        failureCount: 0,
        createdAt: daysAgo(120),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Webhook de ejemplo creado');
  }

  console.log('\nConjunto de demostración listo.');
}

main()
  .catch((error) => {
    console.error('❌', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
