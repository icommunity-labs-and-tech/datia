'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItemCategories(itemId: string) {
  const organizationId = await requireOrganizationId();
  return await itemRepository.getItemCategories(itemId, organizationId);
}

