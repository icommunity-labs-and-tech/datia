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
  list(organizationId: string): Promise<WebhookRecord[]>;
  getById(id: string, organizationId: string): Promise<WebhookRecord | null>;
  create(organizationId: string, input: CreateWebhookInput): Promise<WebhookRecord>;
  update(id: string, organizationId: string, input: UpdateWebhookInput): Promise<WebhookRecord>;
  delete(id: string, organizationId: string): Promise<void>;
  updateTriggered(id: string, success: boolean): Promise<void>;
  findByOrganizationAndActive(organizationId: string, active: boolean): Promise<WebhookRecord[]>;
  findByEvent(organizationId: string, eventType: string): Promise<WebhookRecord[]>;
}

