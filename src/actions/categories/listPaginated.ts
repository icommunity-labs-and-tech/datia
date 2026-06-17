'use server';

import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import { CategoryRecord } from '@/domain/categories/CategoryRepository';

export async function getCategoriesPaginated(
  params: CursorPaginationParams
): Promise<CursorPaginationResult<CategoryRecord>> {
  const organizationId = await requireOrganizationId();
  return await categoryRepository.listPaginated(organizationId, params);
}

