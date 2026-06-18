import { PrismaClient } from '../src/generated/prisma-e2e/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function bootstrapE2EUsers() {
  try {
    console.log('🔧 Seeding E2E users in SQLite...\n');

    // Create admin user
    const adminEmail = 'admin@datia.icommunitylabs.com';
    const adminPassword = 'admin123';
    const adminHashed = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: adminHashed,
          name: 'Admin E2E',
          role: 'ADMIN',
          verificationStatus: 'VERIFIED'
        }
      });
      console.log(`✅ Created admin: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`⚠️  Admin already exists: ${adminEmail}`);
    }

    // Create operator user
    const operatorEmail = 'operator@datia.icommunitylabs.com';
    const operatorPassword = 'operator123';
    const operatorHashed = await bcrypt.hash(operatorPassword, 10);

    const existingOperator = await prisma.user.findUnique({
      where: { email: operatorEmail }
    });

    if (!existingOperator) {
      await prisma.user.create({
        data: {
          email: operatorEmail,
          password: operatorHashed,
          name: 'Operator E2E',
          role: 'USER', // Assuming operators are USER role
          verificationStatus: 'VERIFIED'
        }
      });
      console.log(`✅ Created operator: ${operatorEmail} / ${operatorPassword}`);
    } else {
      console.log(`⚠️  Operator already exists: ${operatorEmail}`);
    }

    console.log('\n🔑 E2E credentials:');
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   Operator: ${operatorEmail} / ${operatorPassword}\n`);

  } catch (error) {
    console.error('❌ Error seeding E2E users:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapE2EUsers();
