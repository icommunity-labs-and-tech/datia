import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

// Ensure a default SQLite URL for local seeding if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with additional users...');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // Array de usuarios adicionales con datos reales
  const additionalUsers = [
    {
      email: 'admin@datacenter.local',
      password: passwordHash,
      name: 'Administrador del Sistema',
      role: 'ADMIN',
      phone: '+34 600 123 456',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: true,
      signatureID: 'admin-sig-001',
      kycURL: 'https://kyc.example.com/admin',
      notes: 'Administrador principal del sistema'
    },
    {
      email: 'juan.perez@datacenter.local',
      password: passwordHash,
      name: 'Juan Pérez',
      role: 'USER',
      phone: '+34 600 234 567',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: false,
      signatureID: 'user-sig-002',
      kycURL: '',
      notes: 'Técnico de sistemas'
    },
    {
      email: 'maria.garcia@datacenter.local',
      password: passwordHash,
      name: 'María García',
      role: 'USER',
      phone: '+34 600 345 678',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: false,
      signatureID: 'user-sig-003',
      kycURL: '',
      notes: 'Técnica de hardware'
    },
    {
      email: 'carlos.rodriguez@datacenter.local',
      password: passwordHash,
      name: 'Carlos Rodríguez',
      role: 'USER',
      phone: '+34 600 456 789',
      verificationStatus: 'WAITING',
      signsWithCertificate: false,
      signatureID: 'user-sig-004',
      kycURL: 'https://kyc.example.com/carlos',
      notes: 'Operador de CPD'
    },
    {
      email: 'ana.lopez@datacenter.local',
      password: passwordHash,
      name: 'Ana López',
      role: 'USER',
      phone: '+34 600 567 890',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: true,
      signatureID: 'user-sig-005',
      kycURL: 'https://kyc.example.com/ana',
      notes: 'Ingeniera de redes'
    },
    {
      email: 'david.martin@datacenter.local',
      password: passwordHash,
      name: 'David Martín',
      role: 'USER',
      phone: '+34 600 678 901',
      verificationStatus: 'NOT_VERIFIED',
      signsWithCertificate: false,
      signatureID: 'user-sig-006',
      kycURL: '',
      notes: 'Técnico de hardware (inactivo)'
    },
    {
      email: 'laura.sanchez@datacenter.local',
      password: passwordHash,
      name: 'Laura Sánchez',
      role: 'USER',
      phone: '+34 600 789 012',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: true,
      signatureID: 'user-sig-007',
      kycURL: 'https://kyc.example.com/laura',
      notes: 'Especialista en seguridad'
    },
    {
      email: 'roberto.hernandez@datacenter.local',
      password: passwordHash,
      name: 'Roberto Hernández',
      role: 'USER',
      phone: '+34 600 890 123',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: false,
      signatureID: 'user-sig-008',
      kycURL: '',
      notes: 'Operador de CPD'
    },
    {
      email: 'carmen.moreno@datacenter.local',
      password: passwordHash,
      name: 'Carmen Moreno',
      role: 'USER',
      phone: '+34 600 901 234',
      verificationStatus: 'REJECTED',
      signsWithCertificate: false,
      signatureID: 'user-sig-009',
      kycURL: 'https://kyc.example.com/carmen',
      notes: 'Técnica de sistemas (KYC rechazado)'
    },
    {
      email: 'miguel.torres@datacenter.local',
      password: passwordHash,
      name: 'Miguel Torres',
      role: 'USER',
      phone: '+34 600 012 345',
      verificationStatus: 'VERIFIED',
      signsWithCertificate: false,
      signatureID: 'user-sig-010',
      kycURL: '',
      notes: 'Técnico de hardware'
    }
  ];

  // Crear usuarios adicionales
  for (const userData of additionalUsers) {
    try {
      const user = await prisma.user.create({
        data: userData
      });
      console.log(`Created user: ${user.name} (${user.email}) - ${user.role}`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`User ${userData.email} already exists, skipping...`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }
  }

  console.log('User seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
