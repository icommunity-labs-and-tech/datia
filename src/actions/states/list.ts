'use server';

import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getStates() {
  const organizationId = await requireOrganizationId();
  return await stateRepository.list(organizationId);
}
