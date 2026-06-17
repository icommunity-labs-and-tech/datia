'use server';

import { CategoryInputError, CategoryAlreadyExistsError, CategoryNotFoundError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string; itemTemplate?: any }
) {
  try {
    const categoryService = createCategoryServiceImpl({ categoryRepository });
    const updated = await categoryService.updateCategory({ id, ...data });
    return updated;
  } catch (error) {
    if (error instanceof CategoryInputError || error instanceof CategoryAlreadyExistsError || error instanceof CategoryNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

