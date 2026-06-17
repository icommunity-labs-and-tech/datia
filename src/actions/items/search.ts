'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function searchItems(query: string) {
  const organizationId = await requireOrganizationId();
  return await itemRepository.search(query, organizationId);
}
