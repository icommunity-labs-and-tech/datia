import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Creando usuario SUPER_ADMIN...\n');
    
    // Verificar si ya existe un SUPER_ADMIN
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (existingSuperAdmin) {
      console.log('⚠️  Ya existe un usuario SUPER_ADMIN:');
      console.log(`   ${existingSuperAdmin.name} (${existingSuperAdmin.email})`);
      console.log('\n🔑 Credenciales existentes:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log('   (La contraseña no se puede mostrar por seguridad)');
      return;
    }
    
    // Crear usuario SUPER_ADMIN
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    
    const now = new Date();
    const superAdmin = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'superadmin@certypass.com',
        password: hashedPassword,
        name: 'Super Administrador',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        organizationId: null, // SUPER_ADMIN no pertenece a ninguna organización
        updatedAt: now,
      }
    });
    
    console.log('✅ Usuario SUPER_ADMIN creado exitosamente:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Contraseña: superadmin123`);
    console.log(`   Role: ${superAdmin.role}\n`);
    
    console.log('🔑 Credenciales de acceso:');
    console.log('   Email: superadmin@certypass.com');
    console.log('   Contraseña: superadmin123\n');
    
    console.log('🌐 Puedes acceder a:');
    console.log('   Super Admin Panel: http://localhost:3000/superadmin');
    console.log('   Login: http://localhost:3000/auth/superadmin/login\n');
    
  } catch (error) {
    console.error('❌ Error al crear usuario SUPER_ADMIN:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
