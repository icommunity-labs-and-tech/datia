'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItem(id: string) {
  if (!id) {
    throw new Error('ID de item requerido');
  }

  const organizationId = await requireOrganizationId();
  const item = await itemRepository.getById(id, organizationId);
  
  if (!item) {
    throw new Error('Item no encontrado');
  }
  
  return {
    ...item,
  };
}
