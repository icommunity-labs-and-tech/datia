import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma-e2e/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ORG_SLUG = 'datia-e2e';

const USERS = [
  { email: 'admin@datia.icommunitylabs.com', password: 'admin123', name: 'Admin E2E', role: 'ADMIN' },
  { email: 'superadmin@datia.icommunitylabs.com', password: 'superadmin123', name: 'Super Admin E2E', role: 'SUPER_ADMIN' },
];

/** Demo assets so galleries and KPIs are not empty during e2e runs. */
const ITEMS = [
  'Turbina eólica T-100',
  'Panel solar PS-220',
  'Batería BESS-40',
  'Inversor INV-12',
];

async function bootstrapE2EUsers() {
  try {
    console.log('🔧 Seeding E2E data in SQLite...\n');
    const now = new Date();

    const org =
      (await prisma.organization.findUnique({ where: { slug: ORG_SLUG } })) ??
      (await prisma.organization.create({
        data: {
          id: randomUUID(),
          nombre: 'Datia E2E',
          slug: ORG_SLUG,
          verificationStatus: 'VERIFIED',
          updatedAt: now,
        },
      }));
    console.log(`✅ Organization: ${org.nombre} (${org.slug})`);

    for (const { email, password, name, role } of USERS) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`⚠️  User already exists: ${email}`);
        continue;
      }
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          password: await bcrypt.hash(password, 10),
          name,
          role,
          status: 'ACTIVE',
          organizationId: org.id,
          updatedAt: now,
        },
      });
      console.log(`✅ Created ${role}: ${email} / ${password}`);
    }

    for (const [index, name] of ITEMS.entries()) {
      const id = `e2e-item-${index}`;
      if (await prisma.item.findUnique({ where: { id } })) continue;
      await prisma.item.create({
        data: {
          id,
          name,
          description: 'Activo de demostración para pruebas end-to-end.',
          organizationId: org.id,
          updatedAt: now,
          // Posición en columnas propias desde #37; el mapa lee de aquí.
          latitude: 41.31 + index * 0.004,
          longitude: -1.55 + index * 0.004,
        },
      });
    }
    console.log(`✅ ${ITEMS.length} demo assets ready`);

    // Energy certification for the first asset, so the public report has
    // something to render in e2e runs.
    const sourceId = 'e2e-source-solar';
    if (!(await prisma.energySource.findUnique({ where: { id: sourceId } }))) {
      await prisma.energySource.create({
        data: {
          id: sourceId,
          itemId: 'e2e-item-0',
          name: 'Planta solar Ariza',
          energyCarrier: 'SOLAR_THERMAL',
          generationTechnology: 'photovoltaic',
          capacityKw: 2400,
          renewableShare: 92,
          countryOfOrigin: 'ES',
          guaranteeOfOriginId: 'GO-2026-0042',
          gridEmissionFactor: 0.158,
          updatedAt: now,
        },
      });

      for (let month = 0; month < 6; month++) {
        const kwh = 18000 + month * 2600;
        const consumption = await prisma.energyConsumption.create({
          data: {
            id: `e2e-consumption-${month}`,
            energySourceId: sourceId,
            periodStart: new Date(2026, month, 1),
            periodEnd: new Date(2026, month + 1, 0),
            consumptionKwh: kwh,
            lifecycleStage: 'USE',
            measurementStandard: 'IEC 61724',
          },
        });
        await prisma.emissionRecord.create({
          data: {
            id: `e2e-emission-${month}`,
            energyConsumptionId: consumption.id,
            co2eKg: (kwh * 0.158) / 10,
            scope: month % 2 ? 'SCOPE_2' : 'SCOPE_3',
            systemBoundary: 'CRADLE_TO_GATE',
            emissionFactor: 0.158,
            emissionFactorSource: 'IEA 2025',
            calculationMethodology: 'ISO 14067',
            gwpCharacterizationFactors: 'IPCC AR6',
            verificationStatus: 'VERIFIED',
            verifierBody: 'Bureau Veritas',
            verificationStandard: 'ISO 14064-3',
          },
        });
      }
      console.log('✅ energy certification ready for e2e-item-0');
    }

    console.log('\n🔑 E2E credentials:');
    for (const { email, password } of USERS) {
      console.log(`   ${email} / ${password}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding E2E data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapE2EUsers();
