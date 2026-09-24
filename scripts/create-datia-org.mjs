#!/usr/bin/env node
/**
 * Creates the Datia organization with energy module enabled and mocked branding.
 * Run with: node scripts/create-datia-org.mjs
 *
 * Safe to run multiple times — will skip creation if org already exists.
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { companyIdFor } from './lib/company.mjs';

const prisma = new PrismaClient();

// Datia brand: teal/green palette
const DATIA_CONFIG = {
  slug: 'datia',
  name: 'Datia',
  domain: 'datia.icommunitylabs.com',
  brandColorPrimary: '#0d9488',   // teal-600
  brandColorSecondary: '#065f46', // emerald-800
  logoUrl: null,                  // placeholder — replace with real logo URL
  settings: {
    modules: {
      passport: false,
      energy: true,
    },
  },
};

const ADMIN_EMAIL = 'admin@datia.icommunitylabs.com';
const ADMIN_PASSWORD = 'datia-dev-2024';

async function main() {
  console.log('🌿 Configurando organización Datia...\n');

  // Check for existing org
  const existing = await prisma.organization.findUnique({ where: { slug: DATIA_CONFIG.slug } });

  let org;
  if (existing) {
    console.log(`⚠️  La organización "${DATIA_CONFIG.slug}" ya existe (id: ${existing.id})`);
    console.log('   Actualizando configuración de módulos y branding...');
    org = await prisma.organization.update({
      where: { slug: DATIA_CONFIG.slug },
      data: {
        brandColorPrimary: DATIA_CONFIG.brandColorPrimary,
        brandColorSecondary: DATIA_CONFIG.brandColorSecondary,
        settings: DATIA_CONFIG.settings,
        domain: DATIA_CONFIG.domain,
      },
    });
    console.log('   ✅ Organización actualizada\n');
  } else {
    org = await prisma.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: DATIA_CONFIG.name,
        slug: DATIA_CONFIG.slug,
        domain: DATIA_CONFIG.domain,
        active: true,
        brandColorPrimary: DATIA_CONFIG.brandColorPrimary,
        brandColorSecondary: DATIA_CONFIG.brandColorSecondary,
        logoUrl: DATIA_CONFIG.logoUrl,
        settings: DATIA_CONFIG.settings,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Organización creada: ${org.name} (${org.id})`);
    console.log(`   Slug:   ${org.slug}`);
    console.log(`   Domain: ${org.domain}`);
    console.log(`   Colors: ${DATIA_CONFIG.brandColorPrimary} / ${DATIA_CONFIG.brandColorSecondary}\n`);

    console.log('✅ Tipos de estado de mantenimiento creados\n');
  }

  // Create or update admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existingAdmin) {
    console.log(`⚠️  Usuario admin ya existe: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        password: passwordHash,
        name: 'Admin Datia',
        role: 'ADMIN',
        status: 'ACTIVE',
        organizationId: org.id,
        companyId: await companyIdFor(prisma, org.id),
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Usuario admin creado: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('   ⚠️  Cambia la contraseña en producción\n');
  }

  console.log('\n📋 Resumen de acceso local:');
  console.log(`   Login admin:    http://localhost:3000/org/datia/admin`);
  console.log(`   Login operator: http://localhost:3000/org/datia/operator`);
  console.log(`   Dashboard:      http://localhost:3000/dashboard`);
  console.log('\n✅ Datia configurada correctamente');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
