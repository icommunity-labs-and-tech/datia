'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export async function getAssetsPaginated(params: CursorPaginationParams): Promise<CursorPaginationResult<{
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
}>> {
  const organizationId = await requireOrganizationId();
  return await assetRepository.listPaginated(organizationId, params);
}

