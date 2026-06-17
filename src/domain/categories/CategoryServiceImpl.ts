import { CategoryService, type CreateCategoryRequest, type UpdateCategoryRequest, type CategoryResponse, type CategoryDetailsResponse } from './CategoryService';
import { CategoryInputError, CategoryAlreadyExistsError, CategoryNotFoundError, CategoryHasDependenciesError } from './errors';
import { revalidatePath } from 'next/cache';
import { CategoryRepository, DbError } from './CategoryRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';

const toResponse = (c: any): CategoryResponse => ({
  id: c.id,
  name: c.name,
  description: c.description,
  itemTemplate: c.itemTemplate ?? [],
  createdAt: c.createdAt,
});

export function createCategoryServiceImpl(deps: {
  categoryRepository: CategoryRepository;
}): CategoryService {
  const { categoryRepository: repo } = deps;

  return {
    async createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
      if (!data.name || !data.description) {
        throw new CategoryInputError(!data.name ? 'name' : 'description', 'Nombre y descripción son obligatorios');
      }
      
      try {
        const organizationId = await requireOrganizationId();
        
        const created = await repo.create({ 
          organizationId,
          name: data.name.trim(), 
          description: data.description.trim(), 
          itemTemplate: data.itemTemplate || [] 
        });

        revalidatePath('/dashboard/categories');
        return toResponse(created);
      } catch (e) {
        if (e instanceof CategoryInputError || e instanceof CategoryAlreadyExistsError) throw e;
        if (e instanceof DbError) {
          throw new CategoryInputError('name', e.message ?? 'Error DB');
        }
        throw e;
      }
    },

    async updateCategory(data: UpdateCategoryRequest): Promise<CategoryResponse> {
      if (!data.id) throw new CategoryInputError('id', 'ID requerido');
      
      try {
        const organizationId = await requireOrganizationId();
        
        const updated = await repo.update(data.id, organizationId, {
          name: data.name?.trim(),
          description: data.description?.trim(),
          itemTemplate: data.itemTemplate,
        });

        revalidatePath('/dashboard/categories');
        return toResponse(updated);
      } catch (e) {
        if (e instanceof CategoryInputError || e instanceof CategoryAlreadyExistsError || e instanceof CategoryNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(data.id, e.message ?? 'No encontrada');
        }
        throw e;
      }
    },

    async deleteCategory(id: string): Promise<void> {
      try {
        const organizationId = await requireOrganizationId();
        
        // dependencies: items
        let itemCount = 0;
        try {
          itemCount = await repo.countItems(id, organizationId);
        } catch {
          itemCount = 0;
        }

        if (itemCount > 0) {
          throw new CategoryHasDependenciesError(id, 'No se puede eliminar la categoría: tiene items asociados');
        }

        await repo.delete(id, organizationId);

        revalidatePath('/dashboard/categories');
      } catch (e) {
        if (e instanceof CategoryNotFoundError || e instanceof CategoryHasDependenciesError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(id, e.message ?? 'No encontrada');
        }
        throw e;
      }
    },

    async getCategory(id: string): Promise<CategoryResponse> {
      try {
        const organizationId = await requireOrganizationId();
        
        const c = await repo.getById(id, organizationId);
        return toResponse(c);
      } catch (e) {
        if (e instanceof CategoryNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(id, e.message ?? 'No encontrada');
        }
        throw e;
      }
    },

    async listCategories(): Promise<CategoryResponse[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const list = await repo.findByOrganization(organizationId);
        return list.map(toResponse);
      } catch {
        return [];
      }
    },

    async getCategoryDetails(id: string): Promise<CategoryDetailsResponse> {
      try {
        const organizationId = await requireOrganizationId();
        
        const c = await repo.getById(id, organizationId);
        let itemCount = 0;
        try {
          itemCount = await repo.countItems(id, organizationId);
        } catch {
          itemCount = 0;
        }

        return { ...toResponse(c), itemCount };
      } catch (e) {
        if (e instanceof CategoryNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(id, e.message ?? 'No encontrada');
        }
        throw e;
      }
    },

    async getCategoryItemCounts(): Promise<Array<{ categoryId: string; name: string; itemCount: number }>> {
      try {
        const organizationId = await requireOrganizationId();
        
        const rows = await repo.listWithItemCounts(organizationId);
        return rows.map((r) => ({ categoryId: r.id, name: r.name, itemCount: r.itemCount }));
      } catch {
        return [];
      }
    },

    async findOrCreateCategory(name: string): Promise<CategoryResponse> {
      try {
        const organizationId = await requireOrganizationId();
        
        // Intentar encontrar la categoría por nombre
        let existing = null;
        try {
          existing = await repo.getByName(name.trim(), organizationId);
        } catch {
          existing = null;
        }
        
        if (existing) {
          return toResponse(existing);
        }
        
        // Si no existe, crearla
        const created = await repo.create({ 
          organizationId,
          name: name.trim(), 
          description: '', 
          itemTemplate: [] 
        });
        
        return toResponse(created);
      } catch (e) {
        if (e instanceof CategoryInputError) throw e;
        if (e instanceof DbError) {
          throw new CategoryInputError('name', e.message ?? 'Error DB');
        }
        throw e;
      }
    },

    async getAllCategories(): Promise<CategoryResponse[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const list = await repo.findByOrganization(organizationId);
        return list.map(toResponse);
      } catch {
        return [];
      }
    },

    async searchCategories(query: string): Promise<CategoryResponse[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        if (!query.trim()) {
          return [];
        }
        
        const list = await repo.searchCategories(query.trim(), organizationId);
        return list.map(toResponse);
      } catch {
        return [];
      }
    },

    async addCategoryToItem(itemId: string, categoryId: string): Promise<void> {
      try {
        const organizationId = await requireOrganizationId();
        
        await repo.addCategoryToItem(itemId, categoryId, organizationId);
      } catch (e) {
        if (e instanceof CategoryNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(categoryId, e.message ?? 'Error al añadir categoría');
        }
        throw e;
      }
    },

    async removeCategoryFromItem(itemId: string, categoryId: string): Promise<void> {
      try {
        const organizationId = await requireOrganizationId();
        
        await repo.removeCategoryFromItem(itemId, categoryId, organizationId);
      } catch (e) {
        if (e instanceof CategoryNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new CategoryNotFoundError(categoryId, e.message ?? 'Error al eliminar categoría');
        }
        throw e;
      }
    },

    async getItemCategories(itemId: string): Promise<CategoryResponse[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const categories = await repo.getItemCategories(itemId, organizationId);
        return categories.map(toResponse);
      } catch {
        return [];
      }
    },
  };
}
