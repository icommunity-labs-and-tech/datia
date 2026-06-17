'use server';

import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export async function getStatesPaginated(
  params: CursorPaginationParams & { itemId?: string }
): Promise<CursorPaginationResult<{
  id: string;
  title: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  createdAt: Date;
  evidenceID: string | null;
  backed: boolean | null;
}>> {
  const organizationId = await requireOrganizationId();
  return await stateRepository.listPaginated(organizationId, params);
}

