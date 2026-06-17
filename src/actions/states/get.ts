'use server';

import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getState(id: string) {
  const organizationId = await requireOrganizationId();
  const st = await stateRepository.getById(id, organizationId);
  return st;
}
