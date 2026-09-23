import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  const createItem = async ({ name, description, imageUrl, latitude, longitude }) => {
    const item = await prisma.item.create({
      data: {
        name,
        description,
        imageUrl: imageUrl || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    return item;
  };

  // Crear items de ejemplo
  await createItem({
    name: 'Router Core 01',
    description: 'Router de núcleo principal',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Linksys_BEFSR41_Router_20040321.jpg',
  });

  await createItem({
    name: 'Switch Acceso 24P-01',
    description: 'Switch de acceso 24 puertos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Network_switches.jpg',
  });

  await createItem({
    name: 'Rack A-01',
    description: 'Rack 42U en fila A',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Wikimedia_Foundation_Servers-8055_01.jpg',
  });

  await createItem({
    name: 'Srv-DB-01',
    description: 'Servidor base de datos',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Wikimedia_Foundation_Servers-8055_03.jpg',
  });

  await createItem({
    name: 'UPS-01',
    description: 'UPS 40kVA',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Uninterruptible_power_supply.jpg',
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
