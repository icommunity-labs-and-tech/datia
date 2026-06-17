import { CategoryRepository, type CategoryRecord, type CreateCategoryInput, type UpdateCategoryInput, DbError } from '@/domain/categories/CategoryRepository';
import { prisma } from '@/lib/prisma';
import { CategoryAlreadyExistsError, CategoryInputError, CategoryNotFoundError } from '@/domain/categories/errors';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';
import crypto from 'crypto';

const toDomain = (c: any): CategoryRecord => ({
  id: c.id,
  name: c.name,
  description: c.description,
  itemTemplate: c.itemTemplate ?? [],
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export const categoryRepository: CategoryRepository = {
  async findByOrganization(organizationId: string): Promise<CategoryRecord[]> {
    try {
      const rows = await prisma.category.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getById(id: string, organizationId: string): Promise<CategoryRecord> {
    try {
      const category = await prisma.category.findFirst({ where: { id, organizationId } });
      if (!category) {
        throw new CategoryNotFoundError(id, 'Categoría no encontrada');
      }
      return toDomain(category);
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async getByName(name: string, organizationId: string): Promise<CategoryRecord> {
    try {
      const category = await prisma.category.findFirst({ where: { name, organizationId } });
      if (!category) {
        throw new CategoryNotFoundError(name, 'Categoría no encontrada');
      }
      return toDomain(category);
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async create(input: CreateCategoryInput): Promise<CategoryRecord> {
    try {
      // Verificar duplicados
      const dup = await prisma.category.findFirst({ 
        where: { 
          name: input.name.trim(),
          organizationId: input.organizationId 
        } 
      });
      if (dup) {
        throw new CategoryAlreadyExistsError(input.name, 'Nombre duplicado');
      }

      const now = new Date();
      const created = await prisma.category.create({
        data: { 
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          name: input.name.trim(), 
          description: input.description.trim(), 
          itemTemplate: input.itemTemplate ?? [],
          updatedAt: now,
        },
      });
      return toDomain(created);
    } catch (e) {
      if (e instanceof CategoryAlreadyExistsError) throw e;
      throw new CategoryInputError('name', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, organizationId: string, changes: UpdateCategoryInput): Promise<CategoryRecord> {
    try {
      // Verificar que la categoría existe y pertenece a la organización
      const existing = await prisma.category.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new CategoryNotFoundError(id, 'Categoría no encontrada');
      }
      
      const updated = await prisma.category.update({
        where: { id },
        data: {
          ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
          ...(changes.description !== undefined ? { description: changes.description.trim() } : {}),
          ...(changes.itemTemplate !== undefined ? { itemTemplate: changes.itemTemplate } : {}),
        },
      });
      return toDomain(updated);
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new CategoryInputError('categoryId', e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que la categoría existe y pertenece a la organización
      const existing = await prisma.category.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new CategoryNotFoundError(id, 'Categoría no encontrada');
      }
      
      await prisma.category.delete({ where: { id } });
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new CategoryNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  async countItems(categoryId: string, organizationId: string): Promise<number> {
    try {
      return await prisma.itemCategory.count({ 
        where: { 
          categoryId,
          Item: { organizationId }
        } 
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listWithItemCounts(organizationId: string) {
    try {
      const rows = await prisma.category.findMany({ 
        where: { organizationId },
        select: { id: true, name: true, _count: { select: { ItemCategory: true } } } 
      });
      return rows.map((r) => ({ id: r.id, name: r.name, itemCount: r._count.ItemCategory }));
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getCategoriesWithItemCounts(organizationId: string) {
    try {
      const categories = await prisma.category.findMany({ 
        where: { organizationId },
        include: { ItemCategory: { include: { Item: true } }, _count: { select: { ItemCategory: true } } } 
      });
      return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        items: cat.ItemCategory.map(ic => ({ id: ic.Item.id })),
        _count: { items: cat._count.ItemCategory },
      }));
    } catch (e) {
      throw new DbError(e);
    }
  },
  
  async addCategoryToItem(itemId: string, categoryId: string, organizationId: string): Promise<void> {
    try {
      // Verificar que la categoría pertenece a la organización
      const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
      if (!category) {
        throw new CategoryNotFoundError(categoryId, 'Categoría no encontrada');
      }
      
      // Verificar que el item pertenece a la organización
      const item = await prisma.item.findFirst({ where: { id: itemId, organizationId } });
      if (!item) {
        throw new DbError({ message: 'Item no encontrado' });
      }
      
      try {
        await prisma.itemCategory.create({
          data: { itemId, categoryId }
        });
      } catch (e: any) {
        // Si ya existe la relación, ignorar el error
        if (e?.code === 'P2002') {
          return;
        }
        throw new DbError(e);
      }
    } catch (e) {
      if (e instanceof CategoryNotFoundError || e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },
  
  async removeCategoryFromItem(itemId: string, categoryId: string, organizationId: string): Promise<void> {
    try {
      // Verificar que la categoría pertenece a la organización
      const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
      if (!category) {
        throw new CategoryNotFoundError(categoryId, 'Categoría no encontrada');
      }
      
      await prisma.itemCategory.deleteMany({
        where: { itemId, categoryId }
      });
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new DbError(e);
    }
  },
  
  async getItemCategories(itemId: string, organizationId: string): Promise<CategoryRecord[]> {
    try {
      // Verificar que el item pertenece a la organización
      const item = await prisma.item.findFirst({ where: { id: itemId, organizationId } });
      if (!item) {
        throw new DbError({ message: 'Item no encontrado' });
      }
      
      const rows = await prisma.itemCategory.findMany({
        where: { itemId },
        include: { Category: true }
      });
      return rows.map((r) => toDomain(r.Category));
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },
  
  async getCategoryItems(categoryId: string, organizationId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      // Verificar que la categoría pertenece a la organización
      const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
      if (!category) {
        throw new CategoryNotFoundError(categoryId, 'Categoría no encontrada');
      }
      
      const rows = await prisma.itemCategory.findMany({
        where: { 
          categoryId,
          Item: { organizationId }
        },
        include: { Item: true }
      });
      return rows.map((r) => ({ id: r.Item.id, name: r.Item.name }));
    } catch (e) {
      if (e instanceof CategoryNotFoundError) throw e;
      throw new DbError(e);
    }
  },
  
  async searchCategories(query: string, organizationId: string): Promise<CategoryRecord[]> {
    try {
      const rows = await prisma.category.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 20,
        orderBy: { name: 'asc' }
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
  
  async listPaginated(organizationId: string, params: CursorPaginationParams) {
    try {
      const limit = params.limit || 20;
      const take = limit + 1; // Request one extra to determine if there's a next page

      const whereClause: any = { organizationId };

      if (params.cursor) {
        // Get the cursor category to find its createdAt
        const cursorCategory = await prisma.category.findFirst({
          where: { id: params.cursor, organizationId },
          select: { createdAt: true, id: true },
        });
        if (cursorCategory) {
          // Categories created before the cursor category, or same createdAt but id < cursor
          whereClause.AND = [
            {
              OR: [
                { createdAt: { lt: cursorCategory.createdAt } },
                { createdAt: cursorCategory.createdAt, id: { lt: params.cursor } },
              ],
            },
          ];
        }
      }

      const categories = await prisma.category.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          itemTemplate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(categories.map(toDomain), limit);
    } catch (e) {
      throw new DbError(e);
    }
  },
  
  // Para SUPER_ADMIN
  async findAll(): Promise<CategoryRecord[]> {
    try {
      const rows = await prisma.category.findMany({ 
        include: { 
          Organization: { select: { nombre: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' } 
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
