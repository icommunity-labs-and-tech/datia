'use server';

import { CategoryNotFoundError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function detachItemFromCategory(categoryId: string, itemId: string) {
  try {
    const categoryService = createCategoryServiceImpl({ categoryRepository });
    await categoryService.removeCategoryFromItem(itemId, categoryId);
    return { success: true };
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

