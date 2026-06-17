'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export async function searchItemsPaginated(
  query: string,
  params: CursorPaginationParams
): Promise<CursorPaginationResult<{
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
}>> {
  const organizationId = await requireOrganizationId();
  return await itemRepository.searchPaginated(query, organizationId, params);
}

