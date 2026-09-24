import type { Scope } from '@/lib/scope';
export interface ApiCallRecord {
  id: string;
  apiTokenId: string;
  organizationId: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: Date;
}

export interface CreateApiCallInput {
  apiTokenId: string;
  organizationId: string;
  /** The token's company; the organisation's default when the token has none. */
  companyId?: string | null;
  method: string;
  path: string;
  statusCode: number;
}

export class DbError extends Error {
  readonly _tag = 'DbError';
  constructor(public readonly cause?: unknown, message: string = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface ApiCallRepository {
  create(input: CreateApiCallInput): Promise<ApiCallRecord>;
  countByToken(apiTokenId: string, scope: Scope): Promise<number>;
  countByTokenAndPeriod(
    apiTokenId: string,
    scope: Scope,
    startDate: Date,
    endDate: Date
  ): Promise<number>;
  getCallsByTokenAndPeriod(
    apiTokenId: string,
    scope: Scope,
    startDate: Date,
    endDate: Date
  ): Promise<ApiCallRecord[]>;
}

