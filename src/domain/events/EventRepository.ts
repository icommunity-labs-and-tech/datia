import type { Scope } from '@/lib/scope';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface EventLogRecord {
  id: string;
  organizationId: string;
  /** The company the event belongs to; where its webhooks are looked up. */
  companyId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  createdAt: Date;
}

export interface CreateEventLogInput {
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface EventRepository {
  list(scope: Scope, limit?: number): Promise<EventLogRecord[]>;
  create(scope: Scope, input: CreateEventLogInput): Promise<EventLogRecord>;
  findByType(scope: Scope, eventType: string, limit?: number): Promise<EventLogRecord[]>;
  findByEntity(scope: Scope, entityType: string, entityId: string): Promise<EventLogRecord[]>;
  getById(scope: Scope, id: string): Promise<EventLogRecord | null>;
  listPaginated(
    scope: Scope,
    params: CursorPaginationParams & { eventType?: string; entityType?: string; entityId?: string }
  ): Promise<CursorPaginationResult<EventLogRecord>>;
}


