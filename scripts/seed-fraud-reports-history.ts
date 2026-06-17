#!/usr/bin/env tsx

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  // Find the Demo organization
  const org = await prisma.organization.findFirst({
    where: { nombre: { contains: 'Demo' } },
  });
  if (!org) { console.error('No demo organization found'); return; }

  // Get some items to attach reports to
  const items = await prisma.item.findMany({
    where: { organizationId: org.id },
    take: 8,
  });
  if (items.length === 0) { console.error('No items found'); return; }

  console.log(`Found org: ${org.nombre} (${org.id})`);
  console.log(`Found ${items.length} items`);

  // Helper to get a date N months ago with some day offset
  const monthsAgo = (months: number, day = 10): Date => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    d.setDate(day);
    d.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0);
    return d;
  };

  const statuses = ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] as const;
  const locations = [
    { acquiredAt: 'Mercadillo El Rastro, Madrid', lat: 40.4082, lng: -3.7059 },
    { acquiredAt: 'Mercado de La Boqueria, Barcelona', lat: 41.3797, lng: 2.1719 },
    { acquiredAt: 'Tienda online no oficial', lat: null, lng: null },
    { acquiredAt: 'Bazar Plaza Nueva, Sevilla', lat: 37.3886, lng: -5.9823 },
    { acquiredAt: 'Mercado Central, Valencia', lat: 39.4735, lng: -0.3797 },
    { acquiredAt: 'Centro comercial no verificado', lat: null, lng: null },
    { acquiredAt: 'Feria de artesanía, Bilbao', lat: 43.2630, lng: -2.9350 },
    { acquiredAt: 'Vendedor ambulante, Zaragoza', lat: 41.6561, lng: -0.8773 },
  ];

  const reportsToCreate = [
    // 8 months ago - 1 report
    { monthsAgo: 8, day: 5, statusIdx: 2, locIdx: 0, itemIdx: 0 },
    // 7 months ago - 2 reports
    { monthsAgo: 7, day: 3, statusIdx: 3, locIdx: 1, itemIdx: 1 },
    { monthsAgo: 7, day: 18, statusIdx: 2, locIdx: 3, itemIdx: 2 },
    // 6 months ago - 2 reports
    { monthsAgo: 6, day: 7, statusIdx: 1, locIdx: 2, itemIdx: 3 },
    { monthsAgo: 6, day: 22, statusIdx: 3, locIdx: 4, itemIdx: 0 },
    // 5 months ago - 3 reports
    { monthsAgo: 5, day: 4, statusIdx: 2, locIdx: 5, itemIdx: 1 },
    { monthsAgo: 5, day: 14, statusIdx: 0, locIdx: 0, itemIdx: 2 },
    { monthsAgo: 5, day: 27, statusIdx: 1, locIdx: 6, itemIdx: 3 },
    // 4 months ago - 2 reports
    { monthsAgo: 4, day: 9, statusIdx: 3, locIdx: 7, itemIdx: 0 },
    { monthsAgo: 4, day: 20, statusIdx: 2, locIdx: 1, itemIdx: 1 },
    // 3 months ago - 4 reports
    { monthsAgo: 3, day: 2, statusIdx: 0, locIdx: 2, itemIdx: 2 },
    { monthsAgo: 3, day: 11, statusIdx: 1, locIdx: 3, itemIdx: 3 },
    { monthsAgo: 3, day: 19, statusIdx: 2, locIdx: 4, itemIdx: 0 },
    { monthsAgo: 3, day: 28, statusIdx: 3, locIdx: 5, itemIdx: 1 },
    // 2 months ago - 5 reports
    { monthsAgo: 2, day: 6, statusIdx: 0, locIdx: 6, itemIdx: 2 },
    { monthsAgo: 2, day: 10, statusIdx: 1, locIdx: 7, itemIdx: 3 },
    { monthsAgo: 2, day: 15, statusIdx: 2, locIdx: 0, itemIdx: 0 },
    { monthsAgo: 2, day: 21, statusIdx: 0, locIdx: 1, itemIdx: 1 },
    { monthsAgo: 2, day: 26, statusIdx: 3, locIdx: 2, itemIdx: 2 },
    // 1 month ago - 4 reports
    { monthsAgo: 1, day: 3, statusIdx: 0, locIdx: 3, itemIdx: 3 },
    { monthsAgo: 1, day: 12, statusIdx: 1, locIdx: 4, itemIdx: 0 },
    { monthsAgo: 1, day: 20, statusIdx: 0, locIdx: 5, itemIdx: 1 },
    { monthsAgo: 1, day: 25, statusIdx: 2, locIdx: 6, itemIdx: 2 },
  ];

  let created = 0;
  for (const r of reportsToCreate) {
    const loc = locations[r.locIdx];
    const item = items[r.itemIdx % items.length];
    const date = monthsAgo(r.monthsAgo, r.day);

    await prisma.fraudReport.create({
      data: {
        itemId: item.id,
        organizationId: org.id,
        acquiredAt: loc.acquiredAt,
        latitude: loc.lat,
        longitude: loc.lng,
        status: statuses[r.statusIdx],
        comments: 'Denuncia de prueba con historial.',
        createdAt: date,
        updatedAt: date,
      },
    });
    created++;
    console.log(`Created report #${created}: ${statuses[r.statusIdx]} — ${date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`);
  }

  console.log(`\nDone. Created ${created} historical fraud reports.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
