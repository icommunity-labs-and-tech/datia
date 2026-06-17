'use server';

import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function searchCategories(query: string) {
  const categoryService = createCategoryServiceImpl({ categoryRepository });
  return await categoryService.searchCategories(query);
}

