'use server';

import { CategoryInputError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function findOrCreateCategory(name: string) {
  try {
    const categoryService = createCategoryServiceImpl({ categoryRepository });
    const category = await categoryService.findOrCreateCategory(name);
    return category;
  } catch (error) {
    if (error instanceof CategoryInputError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

