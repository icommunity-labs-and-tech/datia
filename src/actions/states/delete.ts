'use server';

import { revalidatePath } from 'next/cache';
import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function deleteState(id: string) {
  const organizationId = await requireOrganizationId();
  const existing = await stateRepository.getById(id, organizationId);
  if (!existing) {
    throw new Error('Estado no encontrado');
  }
  
  await stateRepository.delete(id, organizationId);
  revalidatePath(`/dashboard/items/${existing.itemId}`);
  return { success: true, message: 'Estado eliminado correctamente' };
}



