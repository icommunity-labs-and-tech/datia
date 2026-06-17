'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function removeCategoriesFromItem(itemId: string, categoryIds: string[]) {
  const organizationId = await requireOrganizationId();
  await itemRepository.removeCategoriesFromItem(itemId, categoryIds, organizationId);
}

