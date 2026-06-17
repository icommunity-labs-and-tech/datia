'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItemsByCategory(categoryId: string) {
  const organizationId = await requireOrganizationId();
  return await itemRepository.listByCategory(categoryId, organizationId);
}

export async function getItemsByModel(modelId: string) {
  return getItemsByCategory(modelId);
}
