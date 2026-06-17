'use server';

import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getStatesByItem(itemId: string) {
  const organizationId = await requireOrganizationId();
  return await stateRepository.listByItem(itemId, organizationId);
}
