'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItemsByCategories(categoryIds: string[]) {
  const organizationId = await requireOrganizationId();
  return await itemRepository.listByCategories(categoryIds, organizationId);
}

