import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface EventLogRecord {
  id: string;
  organizationId: string;
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
  list(organizationId: string, limit?: number): Promise<EventLogRecord[]>;
  create(organizationId: string, input: CreateEventLogInput): Promise<EventLogRecord>;
  findByType(organizationId: string, eventType: string, limit?: number): Promise<EventLogRecord[]>;
  findByEntity(organizationId: string, entityType: string, entityId: string): Promise<EventLogRecord[]>;
  getById(organizationId: string, id: string): Promise<EventLogRecord | null>;
  listPaginated(
    organizationId: string,
    params: CursorPaginationParams & { eventType?: string; entityType?: string; entityId?: string }
  ): Promise<CursorPaginationResult<EventLogRecord>>;
}


