'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItemDetails(id: string) {
  const organizationId = await requireOrganizationId();
  return await itemRepository.getDetails(id, organizationId);
}
