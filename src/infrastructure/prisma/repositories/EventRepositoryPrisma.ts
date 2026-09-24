import { EventRepository, type EventLogRecord, type CreateEventLogInput, DbError } from '@/domain/events/EventRepository';
import { prisma } from '@/lib/prisma';
import { defaultCompanyId } from '@/lib/company';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';
import { randomUUID } from 'crypto';

const toDomain = (e: any): EventLogRecord => ({
  id: e.id,
  organizationId: e.organizationId,
  eventType: e.eventType,
  entityType: e.entityType,
  entityId: e.entityId,
  data: e.data ?? {},
  createdAt: e.createdAt,
});

export const eventRepository: EventRepository = {
  async list(organizationId: string, limit: number = 100): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(organizationId: string, input: CreateEventLogInput): Promise<EventLogRecord> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const event = await prisma.eventLog.create({
        data: {
          id: randomUUID(),
          organizationId,
          companyId: await defaultCompanyId(organizationId),
          eventType: input.eventType,
          entityType: input.entityType,
          entityId: input.entityId,
          data: input.data,
        },
      });
      return toDomain(event);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByType(organizationId: string, eventType: string, limit: number = 100): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: { organizationId, eventType },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByEntity(organizationId: string, entityType: string, entityId: string): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: { organizationId, entityType, entityId },
        orderBy: { createdAt: 'desc' },
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getById(organizationId: string, id: string): Promise<EventLogRecord | null> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const event = await prisma.eventLog.findFirst({
        where: { id, organizationId },
      });
      return event ? toDomain(event) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listPaginated(organizationId: string, params: CursorPaginationParams & { eventType?: string; entityType?: string; entityId?: string }) {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const limit = params.limit || 20;
      const take = limit + 1; // Request one extra to determine if there's a next page

      const whereClause: any = { organizationId };
      
      // Add optional filters
      if (params.eventType) {
        whereClause.eventType = params.eventType;
      }
      if (params.entityType) {
        whereClause.entityType = params.entityType;
      }
      if (params.entityId) {
        whereClause.entityId = params.entityId;
      }

      if (params.cursor) {
        // Get the cursor event to find its createdAt
        const cursorEvent = await prisma.eventLog.findFirst({
          where: { id: params.cursor, organizationId },
          select: { createdAt: true, id: true },
        });
        if (cursorEvent) {
          // Build AND conditions for cursor pagination
          const andConditions: any[] = [];
          
          // Add organization filter
          andConditions.push({ organizationId });
          
          // Add cursor pagination condition
          andConditions.push({
            OR: [
              { createdAt: { lt: cursorEvent.createdAt } },
              { createdAt: cursorEvent.createdAt, id: { lt: params.cursor } },
            ],
          });
          
          // Add filters if they exist
          if (params.eventType) {
            andConditions.push({ eventType: params.eventType });
          }
          if (params.entityType) {
            andConditions.push({ entityType: params.entityType });
          }
          if (params.entityId) {
            andConditions.push({ entityId: params.entityId });
          }
          
          whereClause.AND = andConditions;
          // Remove top-level filters since they're now in AND
          delete whereClause.organizationId;
          delete whereClause.eventType;
          delete whereClause.entityType;
          delete whereClause.entityId;
        }
      }

      const events = await prisma.eventLog.findMany({
        where: whereClause,
        select: {
          id: true,
          organizationId: true,
          eventType: true,
          entityType: true,
          entityId: true,
          data: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
      });

      return createPaginationResponse(events.map(toDomain), limit);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
