#!/usr/bin/env node

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

// Configuración de instancias por producto
const ITEM_INSTANCES_CONFIG = {
  'Instalación Paneles Solares Básica': 5, // 5 instalaciones disponibles
  'Paneles Canadian Solar': 8, // 8 paneles individuales
  'Paneles Exiom': 6, // 6 paneles individuales
  'Paneles Aiko': 4, // 4 paneles individuales
  'Instalación Baterías Solares': 3, // 3 instalaciones disponibles
  'Tesla Powerwall': 2, // 2 baterías Tesla
  'Sonnen Battery': 3, // 3 baterías Sonnen
  'Enphase Microinversores': 10, // 10 microinversores
  'Huawei Inversores': 5, // 5 inversores Huawei
  'Cargador Vehículo Eléctrico': 4, // 4 cargadores
  'Wallbox Cargador Inteligente': 6, // 6 cargadores Wallbox
  'Sistema Aerotermia': 2, // 2 sistemas de aerotermia
  'Suscripción Solar': 1 // 1 plan de suscripción
};

async function createItemInstances() {
  console.log('🔄 Creando instancias individuales de productos...');
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const [productName, instanceCount] of Object.entries(ITEM_INSTANCES_CONFIG)) {
    try {
      // Buscar el producto original
      const originalItem = await prisma.item.findFirst({
        where: { name: productName },
        include: { category: true }
      });
      
      if (!originalItem) {
        console.log(`⚠️ Producto no encontrado: ${productName}`);
        totalSkipped++;
        continue;
      }
      
      // Verificar cuántas instancias ya existen
      const existingInstances = await prisma.item.count({
        where: {
          name: { startsWith: `${productName} - Instancia` },
          categoryId: originalItem.categoryId
        }
      });
      
      if (existingInstances >= instanceCount) {
        console.log(`ℹ️ Ya existen ${existingInstances} instancias de ${productName}`);
        totalSkipped++;
        continue;
      }
      
      // Crear instancias individuales
      const instancesToCreate = instanceCount - existingInstances;
      console.log(`📦 Creando ${instancesToCreate} instancias de ${productName}...`);
      
      for (let i = 1; i <= instancesToCreate; i++) {
        const instanceNumber = existingInstances + i;
        const instanceName = `${productName} - Instancia ${instanceNumber}`;
        
        // Verificar si esta instancia específica ya existe
        const existingInstance = await prisma.item.findFirst({
          where: {
            name: instanceName,
            categoryId: originalItem.categoryId
          }
        });
        
        if (existingInstance) {
          console.log(`⏭️ Instancia ya existe: ${instanceName}`);
          continue;
        }
        
        // Crear la instancia
        await prisma.item.create({
          data: {
            name: instanceName,
            description: `${originalItem.description} (Instancia física ${instanceNumber})`,
            imageUrl: originalItem.imageUrl,
            categoryId: originalItem.categoryId,
            itemTemplate: JSON.stringify({
              ...JSON.parse(originalItem.itemTemplate || '{}'),
              instancia: instanceNumber,
              total_instancias: instanceCount,
              producto_original: productName,
              estado_fisico: 'Disponible',
              ubicacion: 'Almacén SotySolar',
              fecha_creacion_instancia: new Date().toISOString()
            })
          }
        });
        
        console.log(`✅ Creada: ${instanceName}`);
        totalCreated++;
      }
      
    } catch (error) {
      console.error(`❌ Error creando instancias de ${productName}:`, error.message);
      totalSkipped++;
    }
  }
  
  console.log(`📈 Resumen: ${totalCreated} instancias creadas, ${totalSkipped} productos omitidos`);
}

async function showInventory() {
  console.log('\n📊 Inventario actual:');
  
  const categories = await prisma.category.findMany({
    where: {
      name: { in: ['Paneles Solares', 'Baterías Solares', 'Inversores', 'Accesorios Solares'] }
    },
    include: {
      items: {
        orderBy: { name: 'asc' }
      }
    }
  });
  
  for (const category of categories) {
    console.log(`\n📁 ${category.name}:`);
    
    // Agrupar por producto original
    const productGroups = {};
    category.items.forEach(item => {
      const originalName = item.name.includes(' - Instancia') 
        ? item.name.split(' - Instancia')[0]
        : item.name;
      
      if (!productGroups[originalName]) {
        productGroups[originalName] = [];
      }
      productGroups[originalName].push(item);
    });
    
    for (const [productName, instances] of Object.entries(productGroups)) {
      const instanceCount = instances.length;
      const isInstance = instances[0].name.includes(' - Instancia');
      
      if (isInstance) {
        console.log(`  🔹 ${productName}: ${instanceCount} instancias`);
        instances.forEach(instance => {
          const template = JSON.parse(instance.itemTemplate || '{}');
          console.log(`    - ${instance.name} (${template.estado_fisico || 'Disponible'})`);
        });
      } else {
        console.log(`  🔸 ${productName}: 1 producto`);
      }
    }
  }
}

async function main() {
  try {
    await createItemInstances();
    await showInventory();
    console.log('\n🎉 Creación de instancias completada!');
  } catch (error) {
    console.error('💥 Error durante la creación:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
