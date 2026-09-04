'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { geolocationOf } from '@/lib/map/installations';

export async function getItems() {
  try {
    const organizationId = await requireOrganizationId();
    const rows = await itemRepository.listForExport(organizationId, { fullPassport: false });
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl ?? undefined,
      createdAt: r.createdAt,
      categoryId: r.categoryId,
      categories: r.categories ?? [], // Array de categorías con id y name
      states: r.states?.slice(0, 1).map((s: any) => ({ title: s.title, backed: s.backed })) ?? [],
      // Position comes from the category's template, so only the coordinate is
      // sent — the rest of the template fields are none of the map's business.
      location: geolocationOf(r.templateFields),
      siteName: r.siteName ?? null,
    }));
  } catch (error) {
    console.error('Error ejecutando getItems:', error);
    throw error;
  }
}
