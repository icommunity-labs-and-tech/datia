import { StateRepository, type CreateStateInput, type StateRecord, DbError } from '@/domain/states/StateRepository';
import { prisma } from '@/lib/prisma';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';
import crypto from 'crypto';

const toDomain = (s: any): StateRecord => ({
  id: s.id,
  title: s.title,
  description: s.description,
  statusTypeId: s.statusTypeId,
  itemId: s.itemId,
  imageUrls: s.imageUrls ?? null,
  evidenceID: s.evidenceID ?? null,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  backed: s.backed ?? null,
});

export const stateRepository: StateRepository = {
  async getById(id: string, organizationId: string): Promise<StateRecord | null> {
    try {
      const state = await prisma.state.findFirst({ 
        where: { 
          id,
          Item: { organizationId }  // Validar a través del Item
        }
      });
      return state ? toDomain(state) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(input: CreateStateInput): Promise<StateRecord> {
    try {
      const id = crypto.randomUUID();
      const state = await prisma.state.create({
        data: {
          id,
          title: input.title,
          description: input.description,
          statusTypeId: input.statusTypeId,
          itemId: input.itemId,
          imageUrls: input.imageUrls ?? [],
          evidenceID: input.evidenceID ?? 'pending',
          createdByUserId: input.createdByUserId,
          templateConfig: input.templateConfig ?? undefined,
        },
      });
      return toDomain(state);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async updateEvidenceId(id: string, organizationId: string, evidenceID: string): Promise<void> {
    try {
      await prisma.state.update({
        where: { id },
        data: { evidenceID },
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      // Si es un error de Prisma de registro no encontrado, proporcionar mensaje más claro
      if (
        errorMessage.includes('Record to update does not exist') ||
        errorMessage.includes('Unique constraint') ||
        errorMessage.includes('not found')
      ) {
        throw new DbError(
          e,
          `State not found: id=${id}. The state may have been deleted or the ID is incorrect.`
        );
      }
      throw new DbError(
        e,
        `Error updating state evidenceID: ${errorMessage}. State ID: ${id}, EvidenceID: ${evidenceID}`
      );
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que el state pertenece a la organización
      const existing = await prisma.state.findFirst({ 
        where: { 
          id,
          Item: { organizationId }
        }
      });
      if (!existing) {
        throw new DbError({ message: 'State no encontrado' }, 'State no encontrado');
      }
      
      await prisma.state.delete({ where: { id } });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async listByItem(itemId: string, organizationId: string) {
    try {
      const rows = await prisma.state.findMany({
        where: { 
          itemId,
          Item: { organizationId }  // Filtrar por organización usando el nombre exacto del schema
        },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrls: true,
          templateConfig: true,
          createdAt: true,
          evidenceID: true,
          backed: true,
          StatusType: { select: { id: true, name: true, description: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrls: r.imageUrls ?? null,
        templateConfig: r.templateConfig,
        createdAt: r.createdAt,
        evidenceID: r.evidenceID ?? null,
        backed: r.backed ?? null,
        statusType: {
          id: r.StatusType?.id,
          name: r.StatusType?.name,
          description: r.StatusType?.description ?? null,
        },
      }));
    } catch (e) {
      throw new DbError(e);
    }
  },

  async update(id: string, organizationId: string, data: Partial<{ itemId: string; statusTypeId: string; evidenceID: string | null; backed: boolean | null; description: string | null }>) {
    try {
      // Verificar que el state pertenece a la organización
      const existing = await prisma.state.findFirst({ 
        where: { 
          id,
          Item: { organizationId }
        }
      });
      if (!existing) {
        throw new DbError({ message: 'State no encontrado' }, 'State no encontrado');
      }
      
      const updateData: any = {};
      if (data.itemId !== undefined) updateData.itemId = data.itemId;
      if (data.statusTypeId !== undefined) updateData.statusTypeId = data.statusTypeId;
      if (data.evidenceID !== undefined) updateData.evidenceID = data.evidenceID;
      if (data.backed !== undefined) updateData.backed = data.backed;
      if (data.description !== undefined) updateData.description = data.description;
      
      return await prisma.state.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          itemId: true,
          statusTypeId: true,
          evidenceID: true,
          backed: true,
          description: true,
          createdAt: true,
        },
      });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  // Dashboard-specific queries
  async countTotalStates(organizationId: string): Promise<number> {
    try {
      return await prisma.state.count({
        where: { Item: { organizationId } }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countBackedStates(organizationId: string): Promise<number> {
    try {
      return await prisma.state.count({ 
        where: { 
          backed: true,
          Item: { organizationId }
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countStatesThisMonth(organizationId: string, startDate: Date): Promise<number> {
    try {
      return await prisma.state.count({
        where: {
          Item: { organizationId },
          createdAt: { gte: startDate }
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getStatesByUserGrouped(organizationId: string, startDate: Date) {
    try {
      const rows = await prisma.state.groupBy({
        by: ['createdByUserId'],
        where: { 
          Item: { organizationId },
          createdAt: { gte: startDate }, 
          createdByUserId: { not: null } 
        },
        _count: { id: true }
      });
      return rows;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getBackedStatesByUserGrouped(organizationId: string, startDate: Date) {
    try {
      const rows = await prisma.state.groupBy({
        by: ['createdByUserId'],
        where: { 
          Item: { organizationId },
          createdAt: { gte: startDate }, 
          createdByUserId: { not: null }, 
          backed: true 
        },
        _count: { id: true }
      });
      return rows;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async list(organizationId: string) {
    try {
      return await prisma.state.findMany({
        where: { Item: { organizationId } },
        select: {
          id: true,
          title: true,
          description: true,
          statusTypeId: true,
          itemId: true,
          createdAt: true,
          evidenceID: true,
          backed: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listPaginated(organizationId: string, params: CursorPaginationParams & { itemId?: string }) {
    try {
      const limit = params.limit || 20;
      const take = limit + 1;

      const whereClause: any = { Item: { organizationId } };
      if (params.itemId) {
        whereClause.itemId = params.itemId;
      }

      if (params.cursor) {
        const cursorState = await prisma.state.findFirst({
          where: { id: params.cursor, Item: { organizationId } },
          select: { createdAt: true, id: true },
        });
        if (cursorState) {
          // Build AND conditions for cursor pagination
          const andConditions: any[] = [];
          
          // Add organization filter
          andConditions.push({ Item: { organizationId } });
          
          // Add itemId filter if present
          if (params.itemId) {
            andConditions.push({ itemId: params.itemId });
          }
          
          // Add cursor pagination condition
          andConditions.push({
            OR: [
              { createdAt: { lt: cursorState.createdAt } },
              { createdAt: cursorState.createdAt, id: { lt: params.cursor } },
            ],
          });
          
          whereClause.AND = andConditions;
          delete whereClause.Item;
          delete whereClause.itemId;
        }
      }

      const states = await prisma.state.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          statusTypeId: true,
          itemId: true,
          createdAt: true,
          evidenceID: true,
          backed: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(states, limit);
    } catch (e) {
      throw new DbError(e);
    }
  },

  // Para SUPER_ADMIN
  async findAll(): Promise<StateRecord[]> {
    try {
      const states = await prisma.state.findMany({
        include: {
          Item: {
            select: {
              organizationId: true,
              Organization: { select: { nombre: true, slug: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return states.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
