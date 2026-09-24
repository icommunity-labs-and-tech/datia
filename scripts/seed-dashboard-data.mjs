import { PrismaClient } from '../src/generated/prisma/index.js';
import { companyIdFor } from './lib/company.mjs';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env.local manualmente
try {
  const envPath = resolve(__dirname, '../.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.error('⚠️  No se pudo cargar .env.local:', error.message);
}

const prisma = new PrismaClient();

// Helper para generar fechas aleatorias en los últimos N días
function randomDate(daysAgo) {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

// Helper para generar un hash de token
function generateTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper para generar ID único
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

async function main() {
  console.log('🌱 Iniciando seed de datos del dashboard...');

  // Obtener la primera organización
  const organization = await prisma.organization.findFirst();
  
  if (!organization) {
    console.error('❌ No se encontró ninguna organización. Por favor, crea una primero.');
    process.exit(1);
  }

  console.log(`✅ Usando organización: ${organization.name} (${organization.id})`);

  const companyId = await companyIdFor(prisma, organization.id);

  // Obtener usuarios de la organización
  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    take: 5,
  });

  if (users.length === 0) {
    console.error('❌ No se encontraron usuarios. Por favor, crea usuarios primero.');
    process.exit(1);
  }

  console.log(`✅ Encontrados ${users.length} usuarios`);

  // Obtener items existentes
  const items = await prisma.asset.findMany({
    where: { organizationId: organization.id },
    take: 10,
  });

  console.log(`✅ Encontrados ${items.length} items`);

  // 1. Crear tokens de API
  console.log('\n📝 Creando tokens de API...');
  
  const apiTokens = [];
  const tokenNames = [
    'Token Integración Frontend',
    'Token Mobile App',
    'Token Servicio Externo',
    'Token Testing',
  ];

  for (let i = 0; i < tokenNames.length; i++) {
    const rawToken = `test_token_${i}_${Date.now()}`;
    const tokenHash = generateTokenHash(rawToken);
    
    const token = await prisma.apiToken.create({
      data: {
        id: generateId(),
        name: tokenNames[i],
        tokenHash,
        organizationId: organization.id,
        companyId,
        lastUsedAt: randomDate(7),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expira en 1 año
        createdAt: randomDate(90),
      },
    });
    
    apiTokens.push(token);
    console.log(`  ✓ Token creado: ${token.name}`);
  }

  // 2. Crear llamadas API
  console.log('\n📞 Creando llamadas API...');
  
  const apiPaths = [
    '/api/assets',
    '/api/assets/{id}',
    '/api/states',
    '/api/categories',
    '/api/users',
  ];
  
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const statusCodes = [200, 201, 204, 400, 404, 500];
  
  let callCount = 0;
  
  // Distribuir llamadas en los últimos 90 días
  for (const token of apiTokens) {
    // Número aleatorio de llamadas por token (entre 50 y 300)
    const numCalls = 50 + Math.floor(Math.random() * 250);
    
    for (let i = 0; i < numCalls; i++) {
      const method = methods[Math.floor(Math.random() * methods.length)];
      const path = apiPaths[Math.floor(Math.random() * apiPaths.length)];
      
      // 90% de éxito, 10% de error
      const statusCode = Math.random() > 0.1 
        ? statusCodes[Math.floor(Math.random() * 3)] // 200, 201, 204
        : statusCodes[3 + Math.floor(Math.random() * 3)]; // 400, 404, 500
      
      await prisma.apiCall.create({
        data: {
          id: generateId(),
          apiTokenId: token.id,
          organizationId: organization.id,
          companyId,
          method,
          path,
          statusCode,
          createdAt: randomDate(90),
        },
      });
      
      callCount++;
    }
  }
  
  console.log(`  ✓ ${callCount} llamadas API creadas`);

  // 3. Crear eventos (EventLog)
  console.log('\n📋 Creando eventos...');
  
  const eventTypes = [
    'asset.created',
    'asset.updated',
    'asset.deleted',
    'user.created',
    'user.updated',
    'export.completed',
    'import.completed',
  ];
  
  let eventCount = 0;
  
  // Crear eventos distribuidos en los últimos 180 días
  for (let i = 0; i < 500; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    
    let entityType, entityId, eventData;
    
    if (eventType.startsWith('asset.')) {
      entityType = 'Asset';
      entityId = items.length > 0 
        ? items[Math.floor(Math.random() * items.length)].id 
        : generateId();
      eventData = {
        assetName: `Activo ${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        userName: user.name,
        action: eventType.split('.')[1],
      };
    } else if (eventType.startsWith('user.')) {
      entityType = 'user';
      entityId = user.id;
      eventData = {
        userEmail: user.email,
        userName: user.name,
        action: eventType.split('.')[1],
      };
    } else if (eventType.startsWith('export.')) {
      entityType = 'export';
      entityId = generateId();
      eventData = {
        exportType: 'items',
        recordCount: Math.floor(Math.random() * 1000),
        userId: user.id,
        userName: user.name,
      };
    } else if (eventType.startsWith('import.')) {
      entityType = 'import';
      entityId = generateId();
      eventData = {
        fileName: `importacion_${Math.floor(Math.random() * 1000)}.csv`,
        recordCount: Math.floor(Math.random() * 500),
        userId: user.id,
        userName: user.name,
      };
    }
    
    await prisma.eventLog.create({
      data: {
        id: generateId(),
        organizationId: organization.id,
        companyId,
        eventType,
        entityType,
        entityId,
        data: eventData,
        createdAt: randomDate(180),
      },
    });
    
    eventCount++;
  }
  
  console.log(`  ✓ ${eventCount} eventos creados`);

  console.log('\n🎉 Seed de datos del dashboard completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`  - Tokens API: ${apiTokens.length}`);
  console.log(`  - Llamadas API: ${callCount}`);
  console.log(`  - Eventos: ${eventCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

