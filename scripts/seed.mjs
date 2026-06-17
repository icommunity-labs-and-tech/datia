import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear categorías
  const networking = await prisma.category.create({
    data: {
      name: 'Redes',
      description: 'Equipos de red y conectividad',
    },
  });

  const infrastructure = await prisma.category.create({
    data: {
      name: 'Infraestructura',
      description: 'Equipos de infraestructura del CPD',
    },
  });

  console.log('✅ Categorías creadas');

  // Crear tipos de estado para cada categoría
  const networkingStatus = {
    created: await prisma.statusType.create({
      data: {
        name: 'Creado',
        description: 'Creación inicial del activo',
        template: [
          { label: 'Creado por', name: 'createdBy', type: 'text' },
          { label: 'Fecha creación', name: 'createdAt', type: 'date' },
          { label: 'Notas', name: 'notes', type: 'text' },
        ],
        categoryId: networking.id,
      },
    }),
    installed: await prisma.statusType.create({
      data: {
        name: 'Instalado',
        description: 'Equipo instalado y configurado',
        template: [
          { label: 'Instalado por', name: 'installedBy', type: 'text' },
          { label: 'Fecha instalación', name: 'installDate', type: 'date' },
          { label: 'Configuración', name: 'config', type: 'text' },
          { label: 'Notas', name: 'notes', type: 'text' },
        ],
        categoryId: networking.id,
      },
    }),
  };

  const infrastructureStatus = {
    created: await prisma.statusType.create({
      data: {
        name: 'Creado',
        description: 'Creación inicial del activo',
        template: [
          { label: 'Creado por', name: 'createdBy', type: 'text' },
          { label: 'Fecha creación', name: 'createdAt', type: 'date' },
          { label: 'Notas', name: 'notes', type: 'text' },
        ],
        categoryId: infrastructure.id,
      },
    }),
    installed: await prisma.statusType.create({
      data: {
        name: 'Instalado',
        description: 'Equipo instalado y operativo',
        template: [
          { label: 'Instalado por', name: 'installedBy', type: 'text' },
          { label: 'Fecha instalación', name: 'installDate', type: 'date' },
          { label: 'Ubicación', name: 'location', type: 'text' },
          { label: 'Notas', name: 'notes', type: 'text' },
        ],
        categoryId: infrastructure.id,
      },
    }),
  };

  console.log('✅ Tipos de estado creados');

  // Helper para crear items con estado inicial
  const createItemWithInitialState = async ({ categoryId, name, description, imageUrl, itemTemplate, templateFields, statusTypes }) => {
    const item = await prisma.item.create({
      data: {
        name,
        description,
        categoryId,
        imageUrl: imageUrl || null,
        itemTemplate: itemTemplate || [],
        templateFields: templateFields || {},
      },
    });

    // Crear estado "Creado" automáticamente
    await prisma.state.create({
      data: {
        itemId: item.id,
        statusTypeId: statusTypes.created.id,
        title: 'Creado',
        description: 'Creación inicial del activo',
        evidenceID: 'EVID-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        backed: false,
        imageUrls: [],
        templateConfig: {
          createdBy: 'Sistema',
          createdAt: new Date().toISOString().slice(0, 10),
          notes: 'Item creado automáticamente',
        },
      },
    });

    return item;
  };

  // Crear items de ejemplo
  await createItemWithInitialState({
    categoryId: networking.id,
    name: 'Router Core 01',
    description: 'Router de núcleo principal',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Linksys_BEFSR41_Router_20040321.jpg',
    itemTemplate: [
      { label: 'Fabricante', name: 'vendor', type: 'text' },
      { label: 'Modelo', name: 'modelNumber', type: 'text' },
      { label: 'Número de serie', name: 'serialNumber', type: 'text' },
      { label: 'RU', name: 'rackUnit', type: 'number' },
      { label: 'IP gestión', name: 'managementIP', type: 'text' },
      { label: 'Throughput (Gbps)', name: 'throughputGbps', type: 'number' },
      { label: 'Garantía hasta', name: 'warrantyEnd', type: 'date' },
    ],
    templateFields: {
      vendor: 'Cisco',
      modelNumber: 'ASR 1001-X',
      serialNumber: 'FTX1234567A',
      managementIP: '10.0.0.1',
      rackUnit: 20,
      throughputGbps: 20,
      warrantyEnd: '2026-05-10',
    },
    statusTypes: networkingStatus,
  });

  await createItemWithInitialState({
    categoryId: networking.id,
    name: 'Switch Acceso 24P-01',
    description: 'Switch de acceso 24 puertos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Network_switches.jpg',
    itemTemplate: [
      { label: 'Fabricante', name: 'vendor', type: 'text' },
      { label: 'Modelo', name: 'modelNumber', type: 'text' },
      { label: 'Número de serie', name: 'serialNumber', type: 'text' },
      { label: 'Puertos', name: 'ports', type: 'number' },
      { label: 'RU', name: 'rackUnit', type: 'number' },
      { label: 'IP gestión', name: 'managementIP', type: 'text' },
    ],
    templateFields: {
      vendor: 'Cisco',
      modelNumber: 'Catalyst 2960',
      serialNumber: 'FOC1234ABCD',
      ports: 24,
      rackUnit: 18,
      managementIP: '10.0.0.2',
    },
    statusTypes: networkingStatus,
  });

  await createItemWithInitialState({
    categoryId: infrastructure.id,
    name: 'Rack A-01',
    description: 'Rack 42U en fila A',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Wikimedia_Foundation_Servers-8055_01.jpg',
    itemTemplate: [
      { label: 'Fila', name: 'row', type: 'text' },
      { label: 'Identificador', name: 'rackNumber', type: 'text' },
      { label: 'Altura (U)', name: 'heightU', type: 'number' },
      { label: 'Ubicación', name: 'location', type: 'text' },
    ],
    templateFields: {
      row: 'A',
      rackNumber: 'A-01',
      heightU: 42,
      location: 'CPD 1 - Pasillo frío',
    },
    statusTypes: infrastructureStatus,
  });

  await createItemWithInitialState({
    categoryId: infrastructure.id,
    name: 'Srv-DB-01',
    description: 'Servidor base de datos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Wikimedia_Foundation_Servers-8055_03.jpg',
    itemTemplate: [
      { label: 'Fabricante', name: 'vendor', type: 'text' },
      { label: 'Modelo', name: 'modelNumber', type: 'text' },
      { label: 'Número de serie', name: 'serialNumber', type: 'text' },
      { label: 'CPU', name: 'cpu', type: 'text' },
      { label: 'RAM (GB)', name: 'ramGB', type: 'number' },
      { label: 'Almacenamiento (TB)', name: 'storageTB', type: 'number' },
      { label: 'SO', name: 'os', type: 'text' },
      { label: 'RU', name: 'rackUnit', type: 'number' },
      { label: 'IP gestión', name: 'managementIP', type: 'text' },
    ],
    templateFields: {
      vendor: 'Dell',
      modelNumber: 'PowerEdge R740',
      serialNumber: 'ABC123456789',
      cpu: 'Intel Xeon Gold 6248',
      ramGB: 128,
      storageTB: 2,
      os: 'Ubuntu Server 22.04',
      rackUnit: 15,
      managementIP: '10.0.20.21',
    },
    statusTypes: infrastructureStatus,
  });

  await createItemWithInitialState({
    categoryId: infrastructure.id,
    name: 'UPS-01',
    description: 'UPS 40kVA',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Uninterruptible_power_supply.jpg',
    itemTemplate: [
      { label: 'Capacidad (kVA)', name: 'capacityKVA', type: 'number' },
      { label: 'Baterías', name: 'batteries', type: 'text' },
      { label: 'Número de serie', name: 'serialNumber', type: 'text' },
      { label: 'Fecha instalación', name: 'installDate', type: 'date' },
    ],
    templateFields: {
      capacityKVA: 40,
      batteries: '12V 100Ah x 16',
      serialNumber: 'UPS123456789',
      installDate: '2023-01-15',
    },
    statusTypes: infrastructureStatus,
  });

  console.log('✅ Items de ejemplo creados');
  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
