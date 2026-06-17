'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function addCategoriesToItem(itemId: string, categoryIds: string[]) {
  const organizationId = await requireOrganizationId();
  await itemRepository.addCategoriesToItem(itemId, categoryIds, organizationId);
}

