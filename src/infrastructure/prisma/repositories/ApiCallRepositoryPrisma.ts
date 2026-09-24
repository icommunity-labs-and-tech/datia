import { ApiCallRepository, type ApiCallRecord, type CreateApiCallInput, DbError } from '@/domain/api-calls/ApiCallRepository';
import type { ApiCall } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { defaultCompanyId } from '@/lib/company';
import { scopeWhere, type Scope } from '@/lib/scope';

const toDomain = (c: ApiCall): ApiCallRecord => ({
  id: c.id,
  apiTokenId: c.apiTokenId,
  organizationId: c.organizationId,
  method: c.method,
  path: c.path,
  statusCode: c.statusCode,
  createdAt: c.createdAt,
});

export const apiCallRepository: ApiCallRepository = {
  async create(input: CreateApiCallInput): Promise<ApiCallRecord> {
    try {
      const call = await prisma.apiCall.create({
        data: {
          id: crypto.randomUUID(),
          apiTokenId: input.apiTokenId,
          organizationId: input.organizationId,
          companyId: input.companyId ?? await defaultCompanyId(input.organizationId),
          method: input.method,
          path: input.path,
          statusCode: input.statusCode,
        },
      });
      return toDomain(call);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async countByToken(apiTokenId: string, scope: Scope): Promise<number> {
    try {
      return await prisma.apiCall.count({
        where: { apiTokenId, ...scopeWhere(scope) },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async countByTokenAndPeriod(apiTokenId: string, scope: Scope, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await prisma.apiCall.count({
        where: {
          apiTokenId,
          ...scopeWhere(scope),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async getCallsByTokenAndPeriod(apiTokenId: string, scope: Scope, startDate: Date, endDate: Date): Promise<ApiCallRecord[]> {
    try {
      const calls = await prisma.apiCall.findMany({
        where: {
          apiTokenId,
          ...scopeWhere(scope),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return calls.map(toDomain);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },
};
