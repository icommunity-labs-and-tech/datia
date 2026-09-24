import { AssetRepository, type AssetRecord, type CreateAssetInput, DbError } from '@/domain/assets/AssetRepository';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { defaultCompanyId } from '@/lib/company';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';

const toDomain = (i: any): AssetRecord => ({
  id: i.id,
  name: i.name,
  description: i.description,
  imageUrl: i.imageUrl ?? null,
  evidenceId: i.evidenceId ?? null,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
  latitude: i.latitude ?? null,
  longitude: i.longitude ?? null,
});

function asJsonObject(value: Prisma.JsonValue): Prisma.JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export const assetRepository: AssetRepository = {
  async findByOrganization(organizationId: string): Promise<AssetRecord[]> {
    try {
      const activos = await prisma.asset.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return activos.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getById(id: string, organizationId: string): Promise<AssetRecord | null> {
    try {
      const asset = await prisma.asset.findFirst({ 
        where: { id, organizationId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          evidenceId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return asset ? toDomain(asset) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getDetails(id: string, organizationId: string) {
    try {
      const asset = await prisma.asset.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
        },
      });
      return asset
        ? {
            id: asset.id,
            name: asset.name,
            description: asset.description ?? null,
            imageUrl: asset.imageUrl ?? null,
          }
        : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listForExport(organizationId: string, options: { fullPassport: boolean }) {
    try {
      const rows = await prisma.asset.findMany({
        where: { organizationId },
        include: {
          // The only place name Datia holds today: assets carry coordinates but
          // no site name, and the source attached to one declares it.
          EnergySource: { select: { location: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r: any) => {
        return {
          id: r.id,
          name: r.name,
          description: r.description ?? null,
          createdAt: r.createdAt,
          siteName: r.EnergySource?.find((e: any) => e.location)?.location ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          imageUrl: r.imageUrl ?? null,
        };
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new DbError(e, `Error al listar activos para exportación: ${message}`);
    }
  },

  async create(input: CreateAssetInput): Promise<AssetRecord> {
    try {
      const now = new Date();
      
      const asset = await prisma.asset.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          companyId: await defaultCompanyId(input.organizationId),
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          // Position has its own columns now; while templates still exist it is
          // taken from whichever field holds it (#37).
          createdByUserId: input.createdByUserId,
          updatedAt: now,
        },
      });
      return toDomain(asset);
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async updateEvidenceId(id: string, organizationId: string, evidenceId: string): Promise<void> {
    try {
      // Verificar que el activo pertenece a la organización
      const existing = await prisma.asset.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new DbError({ message: 'Activo no encontrado' }, 'Activo no encontrado');
      }
      
      await prisma.asset.update({ where: { id }, data: { evidenceId } });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que el activo pertenece a la organización
      const existing = await prisma.asset.findFirst({ where: { id, organizationId } });
      if (!existing) {
        throw new DbError({ message: 'Activo no encontrado' }, 'Activo no encontrado');
      }
      
      await prisma.asset.delete({ where: { id } });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  
  
  
  

  async search(query: string, organizationId: string) {
    try {
      const q = query.trim();
      if (!q) return [];
      const activos = await prisma.asset.findMany({
        where: { 
          organizationId,
          OR: [{ name: { contains: q } }, { id: q }] 
        },
        select: { id: true, name: true, description: true, imageUrl: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return activos.map((i) => ({
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
      return await prisma.asset.count({ where: { organizationId } });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countActiveItems(organizationId: string, days: number): Promise<number> {
    try {
      // Activity is what has been anchored for the asset: its state history is
      // gone (#63), and a proof is the only dated thing an asset gathers now.
      return await prisma.asset.count({
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
      return await prisma.asset.count({ 
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
      const companyId = await defaultCompanyId(organizationId);
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        for (const row of rows) {
          await tx.asset.create({
            data: {
              id: row.id,
              organizationId,
              companyId,
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
        // Get the cursor asset to find its createdAt
        const cursorItem = await prisma.asset.findFirst({
          where: { id: params.cursor, organizationId },
          select: { createdAt: true, id: true },
        });
        if (cursorItem) {
          // Items created before the cursor asset, or same createdAt but id < cursor
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

      const activos = await prisma.asset.findMany({
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

      return createPaginationResponse(activos, limit);
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
        const cursorItem = await prisma.asset.findFirst({
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

      const activos = await prisma.asset.findMany({
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

      return createPaginationResponse(activos, limit);
    } catch (e) {
      throw new DbError(e);
    }
  },

};
