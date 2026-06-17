#!/usr/bin/env node

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Creando item "Radio de Mario" con estados con geolocalización...\n');

  try {
    // Obtener la primera organización disponible
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      throw new Error('No se encontró ninguna organización. Por favor, crea una organización primero.');
    }
    console.log(`✅ Usando organización: ${organization.name} (${organization.id})\n`);

    // Obtener o crear una categoría para el radio
    let category = await prisma.category.findFirst({
      where: {
        organizationId: organization.id,
        name: {
          contains: 'Radio',
          mode: 'insensitive',
        },
      },
    });

    if (!category) {
      // Buscar cualquier categoría existente
      category = await prisma.category.findFirst({
        where: {
          organizationId: organization.id,
        },
      });

      if (!category) {
        throw new Error('No se encontró ninguna categoría. Por favor, crea una categoría primero.');
      }
      console.log(`✅ Usando categoría existente: ${category.name} (${category.id})\n`);
    } else {
      console.log(`✅ Usando categoría existente: ${category.name} (${category.id})\n`);
    }

    // Buscar un StatusType con geolocalización
    const allStatusTypes = await prisma.statusType.findMany({
      where: {
        organizationId: organization.id,
      },
    });

    // Buscar uno que tenga geolocation en el template
    let statusType = allStatusTypes.find((st) => {
      try {
        const template = Array.isArray(st.template) ? st.template : [];
        return template.some((field) => field.type === 'geolocation');
      } catch {
        return false;
      }
    });

    if (!statusType) {
      // Crear un StatusType con geolocalización
      const statusTypeId = `status-type-ubicacion-${Date.now()}`;
      statusType = await prisma.statusType.create({
        data: {
          id: statusTypeId,
          name: 'Ubicación',
          description: 'Estado con geolocalización',
          template: [
            { label: 'Ubicación', name: 'location', type: 'geolocation', required: true },
            { label: 'Notas', name: 'notes', type: 'text' },
          ],
          organizationId: organization.id,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Creado StatusType: ${statusType.name} (${statusType.id})\n`);
    } else {
      console.log(`✅ Usando StatusType existente: ${statusType.name} (${statusType.id})\n`);
    }

    // Buscar o crear el item "Radio de Mario"
    let item = await prisma.item.findFirst({
      where: {
        organizationId: organization.id,
        name: {
          contains: 'Radio de Mario',
          mode: 'insensitive',
        },
      },
    });

    if (!item) {
      // Crear el item
      item = await prisma.item.create({
        data: {
          id: `radio-mario-${Date.now()}`,
          name: 'Radio de Mario',
          description: 'Radio portátil de Mario con seguimiento de ubicación',
          organizationId: organization.id,
          categoryId: category.id,
          itemTemplate: [],
          templateFields: {},
        },
      });
      console.log(`✅ Creado item: ${item.name} (${item.id})\n`);
    } else {
      console.log(`✅ Item ya existe: ${item.name} (${item.id})\n`);
    }

    // Coordenadas de ejemplo en diferentes ciudades de España
    const locations = [
      { lat: 40.4168, lng: -3.7038, title: 'Inicio', description: 'Radio entregado en Madrid centro' },
      { lat: 40.4378, lng: -3.6795, title: 'En tránsito', description: 'Radio en camino hacia el norte' },
      { lat: 41.3851, lng: 2.1734, title: 'Barcelona', description: 'Radio llegó a Barcelona' },
      { lat: 39.4699, lng: -0.3763, title: 'Valencia', description: 'Radio en Valencia' },
      { lat: 37.3891, lng: -5.9845, title: 'Sevilla', description: 'Radio llegó a Sevilla' },
      { lat: 41.6488, lng: -0.8891, title: 'Zaragoza', description: 'Radio en Zaragoza' },
      { lat: 43.2627, lng: -2.9253, title: 'Bilbao', description: 'Radio llegó a Bilbao' },
      { lat: 42.8782, lng: -8.5448, title: 'Santiago de Compostela', description: 'Radio en Santiago de Compostela' },
      { lat: 38.3452, lng: -0.4810, title: 'Alicante', description: 'Radio llegó a Alicante' },
      { lat: 40.4168, lng: -3.7038, title: 'Retorno', description: 'Radio regresó a Madrid' },
    ];

    // Crear estados con geolocalización
    console.log('📍 Creando estados con geolocalización...\n');
    const createdStates = [];

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (locations.length - i - 1)); // Diferentes fechas

      // Verificar si el estado ya existe
      const existingState = await prisma.state.findFirst({
        where: {
          itemId: item.id,
          title: location.title,
        },
      });

      if (existingState) {
        console.log(`⏭️  Estado "${location.title}" ya existe, omitiendo...`);
        continue;
      }

      const stateId = `state-${item.id}-${Date.now()}-${i}`;
      const state = await prisma.state.create({
        data: {
          id: stateId,
          itemId: item.id,
          statusTypeId: statusType.id,
          title: location.title,
          description: location.description,
          evidenceID: `EVID-${Date.now()}-${i}`,
          backed: false,
          imageUrls: [],
          templateConfig: {
            location: {
              lat: location.lat,
              lng: location.lng,
            },
            notes: `Estado creado automáticamente - ${location.title}`,
          },
          createdAt: createdAt,
        },
      });

      createdStates.push(state);
      console.log(`✅ Creado estado "${location.title}" en (${location.lat.toFixed(6)}, ${location.lng.toFixed(6)})`);
    }

    console.log(`\n🎉 ¡Completado! Se crearon ${createdStates.length} estados para el item "Radio de Mario"`);
    console.log(`\n📋 Resumen:`);
    console.log(`   - Item: ${item.name} (${item.id})`);
    console.log(`   - Estados creados: ${createdStates.length}`);
    console.log(`   - Puedes ver el mapa en: /dashboard/items/${item.id}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución:', e);
    process.exit(1);
  });

