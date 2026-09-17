import { ApiCallRepository, type ApiCallRecord, type CreateApiCallInput, DbError } from '@/domain/api-calls/ApiCallRepository';
import type { ApiCall } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

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

  async countByToken(apiTokenId: string, organizationId: string): Promise<number> {
    try {
      return await prisma.apiCall.count({
        where: { apiTokenId, organizationId },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async countByTokenAndPeriod(apiTokenId: string, organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await prisma.apiCall.count({
        where: {
          apiTokenId,
          organizationId,
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

  async getCallsByTokenAndPeriod(apiTokenId: string, organizationId: string, startDate: Date, endDate: Date): Promise<ApiCallRecord[]> {
    try {
      const calls = await prisma.apiCall.findMany({
        where: {
          apiTokenId,
          organizationId,
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
