'use server';

import { CategoryInputError, CategoryAlreadyExistsError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function addCategory(formData: Record<string, any>) {
  const { name, description, itemTemplate } = formData;
  try {
    const categoryService = createCategoryServiceImpl({ categoryRepository });
    const created = await categoryService.createCategory({ name, description, itemTemplate });
    return created;
  } catch (error) {
    if (error instanceof CategoryInputError || error instanceof CategoryAlreadyExistsError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

