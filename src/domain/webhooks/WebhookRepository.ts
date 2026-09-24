import type { Scope } from '@/lib/scope';
export interface WebhookRecord {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  active: boolean;
  headers: Record<string, string> | null;
  lastTriggeredAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  active?: boolean;
  headers?: Record<string, string> | null;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string | null;
  events?: string[];
  active?: boolean;
  headers?: Record<string, string> | null;
}

export class DbError extends Error {
  readonly _tag = 'DbError';
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface WebhookRepository {
  list(scope: Scope): Promise<WebhookRecord[]>;
  getById(id: string, scope: Scope): Promise<WebhookRecord | null>;
  create(scope: Scope, input: CreateWebhookInput): Promise<WebhookRecord>;
  update(id: string, scope: Scope, input: UpdateWebhookInput): Promise<WebhookRecord>;
  delete(id: string, scope: Scope): Promise<void>;
  updateTriggered(id: string, success: boolean): Promise<void>;
  findByOrganizationAndActive(scope: Scope, active: boolean): Promise<WebhookRecord[]>;
  findByEvent(scope: Scope, eventType: string): Promise<WebhookRecord[]>;
}

