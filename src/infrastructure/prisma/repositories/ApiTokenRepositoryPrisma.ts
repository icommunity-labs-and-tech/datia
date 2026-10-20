import { ApiTokenRepository, type ApiTokenRecord, type CreateApiTokenInput, DbError } from '@/domain/api-tokens/ApiTokenRepository';
import { prisma } from '@/lib/prisma';
import { defaultCompanyId } from '@/lib/company';
import type { Scope } from '@/lib/scope';

// ApiToken has no organizationId column of its own (#25) — unlike every other
// scoped table, it's always company-scoped, so the org side of a scope is
// filtered through the Company relation instead of a flat field. The org is
// still checked even with a company id set, same as scopeWhere: a company id
// from another organisation matches nothing.
const apiTokenScopeWhere = (scope: Scope) => ({
  Company: {
    organizationId: scope.organizationId,
    ...(scope.companyId ? { id: scope.companyId } : {}),
  },
});

const toDomain = (t: any): ApiTokenRecord => ({
  id: t.id,
  name: t.name,
  tokenHash: t.tokenHash,
  organizationId: t.Company.organizationId,
  companyId: t.companyId,
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
          companyId: input.companyId ?? await defaultCompanyId(input.organizationId),
          expiresAt: input.expiresAt ?? null,
        },
        include: { Company: true },
      });
      return toDomain(token);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async findByOrganization(scope: Scope): Promise<ApiTokenRecord[]> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const tokens = await prisma.apiToken.findMany({
        where: apiTokenScopeWhere(scope),
        include: { Company: true },
        orderBy: { createdAt: 'desc' }
      });
      return tokens.map(toDomain);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async findById(id: string, scope: Scope): Promise<ApiTokenRecord | null> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const token = await prisma.apiToken.findFirst({
        where: { id, ...apiTokenScopeWhere(scope) },
        include: { Company: true },
      });
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
      const token = await prisma.apiToken.findUnique({
        where: { tokenHash },
        include: { Company: true },
      });
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

  async delete(id: string, scope: Scope): Promise<void> {
    try {
      if (!prisma.apiToken) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo apiToken. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo apiToken. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      await prisma.apiToken.deleteMany({
        where: { id, ...apiTokenScopeWhere(scope) },
      });
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },
};
