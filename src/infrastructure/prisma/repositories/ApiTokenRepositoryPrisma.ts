import { ApiTokenRepository, type ApiTokenRecord, type CreateApiTokenInput, DbError } from '@/domain/api-tokens/ApiTokenRepository';
import { prisma } from '@/lib/prisma';

const toDomain = (t: any): ApiTokenRecord => ({
  id: t.id,
  name: t.name,
  tokenHash: t.tokenHash,
  organizationId: t.organizationId,
  lastUsedAt: t.lastUsedAt,
  expiresAt: t.expiresAt,
  createdAt: t.createdAt,
});

export const apiTokenRepository: ApiTokenRepository = {
  async create(input: CreateApiTokenInput): Promise<ApiTokenRecord> {
    try {
      const token = await prisma.apiToken.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          tokenHash: input.tokenHash,
          organizationId: input.organizationId,
          expiresAt: input.expiresAt ?? null,
        },
      });
      return toDomain(token);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async findByOrganization(organizationId: string): Promise<ApiTokenRecord[]> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const tokens = await prisma.apiToken.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return tokens.map(toDomain);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async findById(id: string, organizationId: string): Promise<ApiTokenRecord | null> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const token = await prisma.apiToken.findFirst({ where: { id, organizationId } });
      return token ? toDomain(token) : null;
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async findByTokenHash(tokenHash: string): Promise<ApiTokenRecord | null> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const token = await prisma.apiToken.findUnique({ where: { tokenHash } });
      return token ? toDomain(token) : null;
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async updateLastUsed(id: string): Promise<void> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      await prisma.apiToken.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      await prisma.apiToken.deleteMany({
        where: { id, organizationId },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },
};
