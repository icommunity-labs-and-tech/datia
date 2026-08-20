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

    const categoryId = 'e2e-category-machinery';
    if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) {
      await prisma.category.create({
        data: {
          id: categoryId,
          name: 'Maquinaria',
          organizationId: org.id,
          updatedAt: now,
        },
      });
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
          ItemCategory: { create: { categoryId } },
        },
      });
    }
    console.log(`✅ ${ITEMS.length} demo assets ready`);

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
