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
  const existing = await prisma.asset.findUnique({ where: { id: data.id } });
  if (existing) { process.stdout.write(`  ⚠  Item ya existe: ${data.name}\n`); return existing; }
  const r = await prisma.asset.create({ data: { ...data, updatedAt: new Date() } });
  process.stdout.write(`  ✅ Item: ${r.name}\n`);
  return r;
}

async function upsertSource(data) {
  const existing = await prisma.energySource.findFirst({ where: { assetId: data.assetId, name: data.name } });
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

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Seeding Datia demo data (ESPR-aligned)\n');

  const org = await prisma.organization.findUnique({ where: { slug: 'datia' } });
  if (!org) { console.error('❌ Org "datia" not found. Run create-datia-org.mjs first'); process.exit(1); }
  console.log(`Org: ${org.name}\n`);

  // ── API token ─────────────────────────────────────────────────────────────
  const RAW_TOKEN = 'datia-demo-token-2024';
  const tokenHash = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex');
  const existingTok = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!existingTok) {
    await prisma.apiToken.create({ data: { id: uid(), name: 'Demo token', tokenHash, organizationId: org.id } });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalSources = await prisma.energySource.count({ where: { Asset: { organizationId: org.id } } });
  const totalConsumptions = await prisma.energyConsumption.count({ where: { EnergySource: { Asset: { organizationId: org.id } } } });
  const totalEmissions = await prisma.emissionRecord.count({ where: { EnergyConsumption: { EnergySource: { Asset: { organizationId: org.id } } } } });
  const pendingEmissions = await prisma.emissionRecord.count({ where: { verificationStatus: 'PENDING', EnergyConsumption: { EnergySource: { Asset: { organizationId: org.id } } } } });

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
  console.log('   http://localhost:3000/customer/asset/DATIA-PV-001');
  console.log('   http://localhost:3000/customer/asset/DATIA-EV-001');
  console.log('   http://localhost:3000/customer/asset/DATIA-WIND-001');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ Seed completado\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
