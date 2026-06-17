import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Crear usuario Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Admin Test',
        password: adminPassword,
        role: 'ADMIN',
        verificationStatus: 'VERIFIED',
      },
    });
    console.log('✅ Usuario Admin creado:', adminUser.email);

    // Crear usuario Operator
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operatorUser = await prisma.user.upsert({
      where: { email: 'operator@test.com' },
      update: {},
      create: {
        email: 'operator@test.com',
        name: 'Operator Test',
        password: operatorPassword,
        role: 'USER',
        verificationStatus: 'VERIFIED',
      },
    });
    console.log('✅ Usuario Operator creado:', operatorUser.email);

    console.log('\n🔑 Credenciales de prueba:');
    console.log('Admin: admin@test.com / admin123');
    console.log('Operator: operator@test.com / operator123');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
