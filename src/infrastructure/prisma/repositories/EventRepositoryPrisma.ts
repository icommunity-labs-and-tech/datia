import { EventRepository, type EventLogRecord, type CreateEventLogInput, DbError } from '@/domain/events/EventRepository';
import { prisma } from '@/lib/prisma';
import { companyFor } from '@/lib/company';
import { scopeWhere, type Scope } from '@/lib/scope';
import { CursorPaginationParams, createPaginationResponse } from '@/lib/api/cursor-pagination';
import { randomUUID } from 'crypto';

const toDomain = (e: any): EventLogRecord => ({
  id: e.id,
  organizationId: e.organizationId,
  companyId: e.companyId ?? null,
  eventType: e.eventType,
  entityType: e.entityType,
  entityId: e.entityId,
  data: e.data ?? {},
  createdAt: e.createdAt,
});

export const eventRepository: EventRepository = {
  async list(scope: Scope, limit: number = 100): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: scopeWhere(scope),
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(scope: Scope, input: CreateEventLogInput): Promise<EventLogRecord> {
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
          organizationId: scope.organizationId,
          companyId: await companyFor(scope),
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

  async findByType(scope: Scope, eventType: string, limit: number = 100): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: { ...scopeWhere(scope), eventType },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByEntity(scope: Scope, entityType: string, entityId: string): Promise<EventLogRecord[]> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const events = await prisma.eventLog.findMany({
        where: { ...scopeWhere(scope), entityType, entityId },
        orderBy: { createdAt: 'desc' },
      });
      return events.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async getById(scope: Scope, id: string): Promise<EventLogRecord | null> {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const event = await prisma.eventLog.findFirst({
        where: { id, ...scopeWhere(scope) },
      });
      return event ? toDomain(event) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listPaginated(scope: Scope, params: CursorPaginationParams & { eventType?: string; entityType?: string; entityId?: string }) {
    try {
      if (!prisma.eventLog) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo eventLog. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo eventLog. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const limit = params.limit || 20;
      const take = limit + 1; // Request one extra to determine if there's a next page

      const filters: any[] = [scopeWhere(scope)];
      if (params.eventType) filters.push({ eventType: params.eventType });
      if (params.entityType) filters.push({ entityType: params.entityType });
      if (params.entityId) filters.push({ entityId: params.entityId });

      if (params.cursor) {
        // Get the cursor event to find its createdAt
        const cursorEvent = await prisma.eventLog.findFirst({
          where: { id: params.cursor, ...scopeWhere(scope) },
          select: { createdAt: true, id: true },
        });
        if (cursorEvent) {
          filters.push({
            OR: [
              { createdAt: { lt: cursorEvent.createdAt } },
              { createdAt: cursorEvent.createdAt, id: { lt: params.cursor } },
            ],
          });
        }
      }
      const whereClause = { AND: filters };

      const events = await prisma.eventLog.findMany({
        where: whereClause,
        select: {
          id: true,
          organizationId: true,
          companyId: true,
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
