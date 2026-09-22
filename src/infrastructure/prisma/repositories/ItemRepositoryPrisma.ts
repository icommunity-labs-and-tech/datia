import { ItemRepository, type ItemRecord, type CreateItemInput, DbError } from '@/domain/items/ItemRepository';
import type { Prisma } from '@/generated/prisma';
import { geolocationOf } from '@/lib/map/installations';
import { prisma } from '@/lib/prisma';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';

const toDomain = (i: any): ItemRecord => ({
  id: i.id,
  name: i.name,
  description: i.description,
  imageUrl: i.imageUrl ?? null,
  itemTemplate: i.itemTemplate ?? [],
  templateFields: i.templateFields ?? null,
  evidenceID: i.evidenceID ?? null,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
});

// Las columnas Json llegan como JsonValue; templateFields es siempre un objeto.
function asJsonObject(value: Prisma.JsonValue): Prisma.JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

/** The position columns for an asset whose template still carries it. */
function geolocationColumns(templateFields: unknown): { latitude?: number; longitude?: number } {
  const position = geolocationOf(templateFields);
  return position ? { latitude: position.lat, longitude: position.lng } : {};
}

export const itemRepository: ItemRepository = {
  async findByOrganization(organizationId: string): Promise<ItemRecord[]> {
    try {
      const items = await prisma.item.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return items.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getById(id: string, organizationId: string): Promise<ItemRecord | null> {
    try {
      const item = await prisma.item.findFirst({ 
        where: { id, organizationId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          itemTemplate: true,
          templateFields: true,
          evidenceID: true,
          createdAt: true,
          updatedAt: true,
          ItemCategory: {
            include: {
              Category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      return item ? toDomain(item) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getDetails(id: string, organizationId: string) {
    try {
      const item = await prisma.item.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
        },
      });
      return item
        ? {
            id: item.id,
            name: item.name,
            description: item.description ?? null,
            imageUrl: item.imageUrl ?? null,
          }
        : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listForExport(organizationId: string, options: { fullPassport: boolean }) {
    try {
      const rows = await prisma.item.findMany({
        where: { organizationId },
        include: {
          ItemCategory: {
            include: {
              Category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          // The only place name Datia holds today: assets carry coordinates but
          // no site name, and the source attached to one declares it.
          EnergySource: { select: { location: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r: any) => {
        const categories = r.ItemCategory?.map((ic: any) => ({
          id: ic.Category.id,
          name: ic.Category.name,
        })) ?? [];
        // Usar la primera categoría para compatibilidad con export si existe
        const categoryName = categories.length > 0 ? categories[0].name : null;
        return {
          id: r.id,
          name: r.name,
          description: r.description ?? null,
          createdAt: r.createdAt,
          categoryId: categoryName, // Primera categoría para compatibilidad con export
          categoryName: categoryName,
          categories: categories, // Array con múltiples categorías
          siteName: r.EnergySource?.find((e: any) => e.location)?.location ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          templateFields: r.templateFields ?? null,
          imageUrl: r.imageUrl ?? null,
        };
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new DbError(e, `Error al listar items para exportación: ${message}`);
    }
  },

  async create(input: CreateItemInput): Promise<ItemRecord> {
    try {
      const now = new Date();
      
      const item = await prisma.item.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl ?? null,
          itemTemplate: input.itemTemplate ?? [],
          templateFields: input.templateFields ?? undefined,
          // Position has its own columns now; while templates still exist it is
          // taken from whichever field holds it (#37).
          ...geolocationColumns(input.templateFields),
          createdByUserId: input.createdByUserId,
          updatedAt: now,
        },
      });
      return toDomain(item);
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async updateEvidenceId(id: string, organizationId: string, evidenceID: string): Promise<void> {
    try {
      // Verificar que el item pertenece a la organización
      const existing = await prisma.item.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new DbError({ message: 'Item no encontrado' }, 'Item no encontrado');
      }
      
      await prisma.item.update({ where: { id }, data: { evidenceID } });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que el item pertenece a la organización
      const existing = await prisma.item.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new DbError({ message: 'Item no encontrado' }, 'Item no encontrado');
      }
      
      await prisma.item.delete({ where: { id } });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async listByCategory(categoryId: string, organizationId: string) {
    try {
      const items = await prisma.item.findMany({
        where: { 
          organizationId,
          ItemCategory: { some: { categoryId } }
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          itemTemplate: true,
          templateFields: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description ?? null,
        imageUrl: i.imageUrl ?? null,
        itemTemplate: Array.isArray(i.itemTemplate) ? i.itemTemplate : [],
        templateFields: asJsonObject(i.templateFields),
        createdAt: i.createdAt,
      }));
    } catch (e) {
      throw new DbError(e);
    }
  },
  
  async listByCategories(categoryIds: string[], organizationId: string) {
    try {
      const items = await prisma.item.findMany({
        where: { 
          organizationId,
          ItemCategory: { some: { categoryId: { in: categoryIds } } }
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          itemTemplate: true,
          templateFields: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description ?? null,
        imageUrl: i.imageUrl ?? null,
        itemTemplate: Array.isArray(i.itemTemplate) ? i.itemTemplate : [],
        templateFields: asJsonObject(i.templateFields),
        createdAt: i.createdAt,
      }));
    } catch (e) {
      throw new DbError(e);
    }
  },
  
  async addCategoriesToItem(itemId: string, categoryIds: string[], organizationId: string): Promise<void> {
    try {
      // Verificar que el item pertenece a la organización
      const item = await prisma.item.findFirst({ where: { id: itemId, organizationId } });
      if (!item) {
        throw new DbError({ message: 'Item no encontrado' }, 'Item no encontrado');
      }
      
      // Verificar que todas las categorías pertenecen a la organización
      const categories = await prisma.category.findMany({ 
        where: { id: { in: categoryIds }, organizationId } 
      });
      if (categories.length !== categoryIds.length) {
        throw new DbError({ message: 'Una o más categorías no encontradas' }, 'Una o más categorías no encontradas');
      }
      
      await prisma.itemCategory.createMany({
        data: categoryIds.map(categoryId => ({ itemId, categoryId })),
        skipDuplicates: true
      });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },
  
  async removeCategoriesFromItem(itemId: string, categoryIds: string[], organizationId: string): Promise<void> {
    try {
      // Verificar que el item pertenece a la organización
      const item = await prisma.item.findFirst({ where: { id: itemId, organizationId } });
      if (!item) {
        throw new DbError({ message: 'Item no encontrado' }, 'Item no encontrado');
      }
      
      await prisma.itemCategory.deleteMany({
        where: { itemId, categoryId: { in: categoryIds } }
      });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },
  
  async getItemCategories(itemId: string, organizationId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      // Verificar que el item pertenece a la organización
      const item = await prisma.item.findFirst({ where: { id: itemId, organizationId } });
      if (!item) {
        throw new DbError({ message: 'Item no encontrado' }, 'Item no encontrado');
      }
      
      const rows = await prisma.itemCategory.findMany({
        where: { itemId },
        include: { Category: true }
      });
      return rows.map((r) => ({ id: r.Category.id, name: r.Category.name }));
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async search(query: string, organizationId: string) {
    try {
      const q = query.trim();
      if (!q) return [];
      const items = await prisma.item.findMany({
        where: { 
          organizationId,
          OR: [{ name: { contains: q } }, { id: q }] 
        },
        select: { id: true, name: true, description: true, imageUrl: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description ?? null,
        imageUrl: i.imageUrl ?? null,
        createdAt: i.createdAt,
      }));
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countTotalItems(organizationId: string): Promise<number> {
    try {
      return await prisma.item.count({ where: { organizationId } });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countActiveItems(organizationId: string, days: number): Promise<number> {
    try {
      // Activity is what has been anchored for the asset: its state history is
      // gone (#63), and a proof is the only dated thing an asset gathers now.
      return await prisma.item.count({
        where: {
          organizationId,
          EnergySource: {
            some: {
              EnergyConsumption: {
                some: {
                  EmissionRecord: {
                    some: {
                      Certification: {
                        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countItemsByMonth(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await prisma.item.count({ 
        where: { 
          organizationId,
          createdAt: { gte: startDate, lt: endDate } 
        } 
      });
    } catch (e) {
      throw new DbError(e);
    }
  },


  async importMany(organizationId: string, rows: Array<{ id: string; name: string; description: string; imageUrl?: string | null }>): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        for (const row of rows) {
          await tx.item.create({
            data: {
              id: row.id,
              organizationId,
              name: row.name,
              description: row.description,
              imageUrl: row.imageUrl ?? null,
              updatedAt: now,
            },
          });
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  // Cursor-based pagination
  async listPaginated(organizationId: string, params: CursorPaginationParams) {
    try {
      const limit = params.limit || 20;
      const take = limit + 1; // Request one extra to determine if there's a next page

      const whereClause: any = { organizationId };
      if (params.cursor) {
        // Get the cursor item to find its createdAt
        const cursorItem = await prisma.item.findFirst({
          where: { id: params.cursor, organizationId },
          select: { createdAt: true, id: true },
        });
        if (cursorItem) {
          // Items created before the cursor item, or same createdAt but id < cursor
          whereClause.AND = [
            {
              OR: [
                { createdAt: { lt: cursorItem.createdAt } },
                { createdAt: cursorItem.createdAt, id: { lt: params.cursor } },
              ],
            },
          ];
        }
      }

      const items = await prisma.item.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(items, limit);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listByCategoryPaginated(categoryId: string, organizationId: string, params: CursorPaginationParams) {
    try {
      const limit = params.limit || 20;
      const take = limit + 1;

      const whereClause: any = {
        organizationId,
        ItemCategory: { some: { categoryId } },
      };

      if (params.cursor) {
        const cursorItem = await prisma.item.findFirst({
          where: { 
            id: params.cursor, 
            organizationId,
            ItemCategory: { some: { categoryId } }, // Verify cursor belongs to filtered set
          },
          select: { createdAt: true, id: true },
        });
        if (cursorItem) {
          // Build AND conditions preserving all filters
          const andConditions: any[] = [
            { organizationId },
            { ItemCategory: { some: { categoryId } } },
            {
              OR: [
                { createdAt: { lt: cursorItem.createdAt } },
                { createdAt: cursorItem.createdAt, id: { lt: params.cursor } },
              ],
            },
          ];
          whereClause.AND = andConditions;
          delete whereClause.organizationId;
          delete whereClause.ItemCategory;
        }
      }

      const items = await prisma.item.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(items, limit);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async searchPaginated(query: string, organizationId: string, params: CursorPaginationParams) {
    try {
      const q = query.trim();
      if (!q) {
        return { data: [], nextCursor: null, hasNextPage: false };
      }

      const limit = params.limit || 20;
      const take = limit + 1;

      const whereClause: any = {
        organizationId,
        OR: [{ name: { contains: q } }, { id: q }],
      };

      if (params.cursor) {
        const cursorItem = await prisma.item.findFirst({
          where: { 
            id: params.cursor, 
            organizationId,
            OR: [{ name: { contains: q } }, { id: q }], // Verify cursor belongs to search results
          },
          select: { createdAt: true, id: true },
        });
        if (cursorItem) {
          // Build AND conditions preserving all filters
          const andConditions: any[] = [
            { organizationId },
            { OR: [{ name: { contains: q } }, { id: q }] },
            {
              OR: [
                { createdAt: { lt: cursorItem.createdAt } },
                { createdAt: cursorItem.createdAt, id: { lt: params.cursor } },
              ],
            },
          ];
          whereClause.AND = andConditions;
          delete whereClause.organizationId;
          delete whereClause.OR;
        }
      }

      const items = await prisma.item.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(items, limit);
    } catch (e) {
      throw new DbError(e);
    }
  },

};
