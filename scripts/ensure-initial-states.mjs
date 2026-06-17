#!/usr/bin/env node

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function ensureInitialStates() {
  console.log('🔍 Verificando estados iniciales para todos los items...\n');

  try {
    // Obtener todos los items
    const items = await prisma.item.findMany({
      include: {
        states: {
          where: {
            title: 'Creado'
          }
        },
        category: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Total de items encontrados: ${items.length}\n`);

    let itemsWithoutInitialState = 0;
    let itemsWithInitialState = 0;
    let createdStates = 0;

    for (const item of items) {
      if (item.states.length === 0) {
        console.log(`❌ Item sin estado inicial: ${item.name} (${item.category.name})`);
        itemsWithoutInitialState++;
        
        // Crear el estado inicial
        try {
          // Buscar o crear el tipo de estado "Creado" para esta categoría
          let createdStatusType = await prisma.statusType.findFirst({
            where: {
              categoryId: item.categoryId,
              name: 'Creado'
            },
            select: { id: true }
          });

          if (!createdStatusType) {
            console.log(`  📝 Creando tipo de estado "Creado" para categoría: ${item.category.name}`);
            
            const createdTemplate = [
              { label: 'Creado por', name: 'createdBy', type: 'text' },
              { label: 'Fecha creación', name: 'createdAt', type: 'date' },
              { label: 'Notas', name: 'notes', type: 'text' },
            ];

            createdStatusType = await prisma.statusType.create({
              data: {
                name: 'Creado',
                description: 'Creación inicial del activo',
                template: createdTemplate,
                categoryId: item.categoryId,
              },
              select: { id: true }
            });
          }

          // Crear el estado "Creado"
          const createdState = await prisma.state.create({
            data: {
              itemId: item.id,
              statusTypeId: createdStatusType.id,
              title: 'Creado',
              description: 'Creación inicial del activo',
              evidenceID: '',
              backed: false,
              imageUrls: [],
              templateConfig: {
                createdBy: 'Sistema',
                createdAt: new Date().toISOString().slice(0, 10),
                notes: 'Item creado automáticamente',
              },
            },
          });

          console.log(`  ✅ Estado "Creado" creado: ${createdState.id}`);
          createdStates++;
        } catch (error) {
          console.error(`  ❌ Error creando estado para ${item.name}:`, error.message);
        }
      } else {
        itemsWithInitialState++;
        console.log(`✅ Item con estado inicial: ${item.name} (${item.category.name})`);
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`  - Items con estado inicial: ${itemsWithInitialState}`);
    console.log(`  - Items sin estado inicial: ${itemsWithoutInitialState}`);
    console.log(`  - Estados creados: ${createdStates}`);

    if (itemsWithoutInitialState === 0) {
      console.log('\n🎉 ¡Todos los items tienen su estado inicial "Creado"!');
    } else {
      console.log(`\n⚠️  Se crearon ${createdStates} estados iniciales para items que no los tenían.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
ensureInitialStates();
