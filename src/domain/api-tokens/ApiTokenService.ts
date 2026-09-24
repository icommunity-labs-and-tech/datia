import type { Scope } from '@/lib/scope';
import type { ApiTokenRepository } from './ApiTokenRepository';
import { DbError } from './ApiTokenRepository';

export interface CreateApiTokenRequest {
  name: string;
  organizationId: string;
  companyId?: string | null;
  expiresAt?: Date | null;
}

export interface ApiTokenResponse {
  id: string;
  name: string;
  token: string; // Only returned once on creation
  organizationId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiTokenListResponse {
  id: string;
  name: string;
  organizationId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export class ApiTokenNotFoundError extends Error {
  readonly _tag = 'ApiTokenNotFoundError';
  constructor(public readonly tokenId: string) {
    super(`API token not found: ${tokenId}`);
  }
}

export class ApiTokenExpiredError extends Error {
  readonly _tag = 'ApiTokenExpiredError';
  constructor() {
    super('API token has expired');
  }
}

export interface ApiTokenService {
  createToken(data: CreateApiTokenRequest): Promise<ApiTokenResponse>;
  listTokens(scope: Scope): Promise<ApiTokenListResponse[]>;
  deleteToken(id: string, scope: Scope): Promise<void>;
  validateToken(tokenHash: string): Promise<{ organizationId: string; companyId: string | null; tokenId: string }>;
}



