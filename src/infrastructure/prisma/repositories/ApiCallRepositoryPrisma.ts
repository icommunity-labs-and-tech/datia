import { ApiCallRepository, type ApiCallRecord, type CreateApiCallInput, DbError } from '@/domain/api-calls/ApiCallRepository';
import { prisma } from '@/lib/prisma';

const toDomain = (c: any): ApiCallRecord => ({
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
      const apiCallModel = (prisma as any).apiCall;
      if (!apiCallModel) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiCall. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiCall. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const call = await apiCallModel.create({
        data: {
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
      const apiCallModel = (prisma as any).apiCall;
      if (!apiCallModel) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiCall. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiCall. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      return await apiCallModel.count({
        where: { apiTokenId, organizationId },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async countByTokenAndPeriod(apiTokenId: string, organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const apiCallModel = (prisma as any).apiCall;
      if (!apiCallModel) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiCall. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiCall. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      return await apiCallModel.count({
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
      const apiCallModel = (prisma as any).apiCall;
      if (!apiCallModel) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiCall. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiCall. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const calls = await apiCallModel.findMany({
        where: {
          apiTokenId,
          organizationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'asc' },
      }) as any[];
      return calls.map(toDomain);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },
};
