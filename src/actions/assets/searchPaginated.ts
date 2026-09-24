'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export async function searchAssetsPaginated(
  query: string,
  params: CursorPaginationParams
): Promise<CursorPaginationResult<{
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
}>> {
  const scope = await requireScope();
  return await assetRepository.searchPaginated(query, scope, params);
}

