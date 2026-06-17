"use server";

import { prisma } from "@/lib/prisma";

export interface SectorListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
}

/**
 * Lista todos los sectores disponibles
 */
export async function listSectors(): Promise<SectorListItem[]> {
  const sectors = await prisma.sector.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  return sectors;
}
