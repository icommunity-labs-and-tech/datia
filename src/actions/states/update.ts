'use server';

import { revalidatePath } from 'next/cache';
import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function updateState(id: string, data: {
  itemId?: string;
  statusTypeId?: string;
  evidenceID?: string | null;
  backed?: boolean | null;
  description?: string | null;
}) {
  const organizationId = await requireOrganizationId();
  const existing = await stateRepository.getById(id, organizationId);
  if (!existing) {
    throw new Error('Estado no encontrado');
  }
  
  const updatedState = await stateRepository.update(id, organizationId, data);

  revalidatePath(`/dashboard/states/${id}`);
  revalidatePath(`/dashboard/items/${updatedState.itemId}`);

  return { success: true, state: updatedState };
}
