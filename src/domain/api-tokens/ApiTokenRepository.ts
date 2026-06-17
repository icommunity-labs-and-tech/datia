export interface ApiTokenRecord {
  id: string;
  name: string;
  tokenHash: string;
  organizationId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateApiTokenInput {
  name: string;
  tokenHash: string;
  organizationId: string;
  expiresAt?: Date | null;
}

export class DbError extends Error {
  readonly _tag = 'DbError';
  constructor(public readonly cause?: unknown, message: string = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface ApiTokenRepository {
  create(input: CreateApiTokenInput): Promise<ApiTokenRecord>;
  findByOrganization(organizationId: string): Promise<ApiTokenRecord[]>;
  findById(id: string, organizationId: string): Promise<ApiTokenRecord | null>;
  findByTokenHash(tokenHash: string): Promise<ApiTokenRecord | null>;
  updateLastUsed(id: string): Promise<void>;
  delete(id: string, organizationId: string): Promise<void>;
}


