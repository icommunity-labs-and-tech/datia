'use server';

import { CategoryHasDependenciesError, CategoryNotFoundError } from '@/domain/categories/errors';
import { createCategoryServiceImpl } from '@/domain/categories/CategoryServiceImpl';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function deleteCategory(id: string) {
  try {
    // Preload info for response
    const organizationId = await requireOrganizationId();
    const c = await categoryRepository.getById(id, organizationId);
    let itemsCount = 0;
    try {
      itemsCount = await categoryRepository.countItems(id, organizationId);
    } catch {
      itemsCount = 0;
    }
    
    if (!c) {
      throw new CategoryNotFoundError(id, 'Categoría no encontrada');
    }

    const categoryService = createCategoryServiceImpl({ categoryRepository });
    await categoryService.deleteCategory(id);

    return {
      success: true,
      message: 'Categoría eliminada correctamente',
      cascadeInfo: {
        itemsDeleted: itemsCount,
        itemNames: []
      }
    };
  } catch (error) {
    if (error instanceof CategoryHasDependenciesError || error instanceof CategoryNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

