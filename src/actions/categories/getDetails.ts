'use server';

import { CategoryNotFoundError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function getCategoryDetails(id: string) {
  try {
    const categoryService = createCategoryServiceImpl({ categoryRepository });
    return await categoryService.getCategoryDetails(id);
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

