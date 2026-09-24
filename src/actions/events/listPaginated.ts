'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import { EventLogRecord } from '@/domain/events/EventRepository';

export async function getEventsPaginated(
  params: CursorPaginationParams & { eventType?: string; entityType?: string; entityId?: string }
): Promise<CursorPaginationResult<EventLogRecord>> {
  const scope = await requireScope();
  return await eventRepository.listPaginated(scope, params);
}

