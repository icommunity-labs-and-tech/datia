const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Creando usuario administrador...\n');
    
    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador:');
      console.log(`   ${existingAdmin.name} (${existingAdmin.email})`);
      return;
    }
    
    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@certypass.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
        verificationStatus: 'VERIFIED'
      }
    });
    
    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Contraseña: admin123`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verification: ${admin.verificationStatus}\n`);
    
    console.log('🔑 Credenciales de acceso:');
    console.log('   Email: admin@certypass.com');
    console.log('   Contraseña: admin123\n');
    
    console.log('🌐 Puedes acceder a:');
    console.log('   Dashboard: http://localhost:3000/dashboard');
    console.log('   Login: http://localhost:3000/auth/dashboard-login');
    
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
