#!/usr/bin/env node

/**
 * Script para restablecer la contraseña de un usuario
 * Uso: node scripts/reset-password.mjs <email> [nueva-contraseña]
 * 
 * Si no se proporciona la nueva contraseña, se generará una automáticamente
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env.local si existe
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (err) {
  // .env.local no existe, usar variables de entorno del sistema
}

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email) {
    console.error('❌ Error: Debes proporcionar un email');
    console.log('\nUso: node scripts/reset-password.mjs <email> [nueva-contraseña]');
    console.log('\nEjemplo:');
    console.log('  node scripts/reset-password.mjs pablocumpian@gmail.com');
    console.log('  node scripts/reset-password.mjs pablocumpian@gmail.com miNuevaContraseña123');
    process.exit(1);
  }

  try {
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        organizationId: true,
      },
    });

    if (!user) {
      console.error(`❌ Error: No se encontró un usuario con el email "${email}"`);
      process.exit(1);
    }

    console.log(`\n📧 Usuario encontrado:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Estado: ${user.status}`);

    // Generar o usar la contraseña proporcionada
    const finalPassword = newPassword || generateRandomPassword();
    
    if (!newPassword) {
      console.log(`\n🔑 Contraseña generada automáticamente: ${finalPassword}`);
    } else {
      console.log(`\n🔑 Nueva contraseña: ${finalPassword}`);
    }

    // Validar longitud mínima
    if (finalPassword.length < 8) {
      console.error('❌ Error: La contraseña debe tener al menos 8 caracteres');
      process.exit(1);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Actualizar la contraseña y activar la cuenta si está PENDING
    const updateData = {
      password: hashedPassword,
      updatedAt: new Date(),
    };

    // Si el usuario está PENDING, activarlo
    if (user.status === 'PENDING') {
      updateData.status = 'ACTIVE';
      updateData.activatedAt = new Date();
      updateData.activationToken = null;
      updateData.activationExpiresAt = null;
      console.log('\n✅ La cuenta también ha sido activada (estaba en estado PENDING)');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log('\n✅ Contraseña restablecida exitosamente');
    console.log(`\n📋 Información de acceso:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Contraseña: ${finalPassword}`);
    console.log(`\n⚠️  Guarda esta información de forma segura.`);

  } catch (error) {
    console.error('❌ Error al restablecer la contraseña:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateRandomPassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Mayúscula
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Número
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Símbolo
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

resetPassword();
