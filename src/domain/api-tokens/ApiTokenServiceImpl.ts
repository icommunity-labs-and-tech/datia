import { ApiTokenService, type CreateApiTokenRequest, type ApiTokenResponse, type ApiTokenListResponse, ApiTokenNotFoundError, ApiTokenExpiredError } from './ApiTokenService';
import type { ApiTokenRepository } from './ApiTokenRepository';
import { DbError } from './ApiTokenRepository';
import { randomBytes, createHash } from 'crypto';

// Generate a secure random token (32 bytes = 64 hex characters)
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash token using SHA-256
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createApiTokenServiceImpl(deps: {
  apiTokenRepository: ApiTokenRepository;
}): ApiTokenService {
  const { apiTokenRepository: repo } = deps;

  return {
    async createToken(data: CreateApiTokenRequest): Promise<ApiTokenResponse> {
      try {
        const token = generateToken();
        const tokenHash = hashToken(token);

        const created = await repo.create({
          name: data.name,
          tokenHash,
          organizationId: data.organizationId,
          expiresAt: data.expiresAt,
        });

        return {
          id: created.id,
          name: created.name,
          token, // Return plain token only once
          organizationId: created.organizationId,
          lastUsedAt: created.lastUsedAt,
          expiresAt: created.expiresAt,
          createdAt: created.createdAt,
        } satisfies ApiTokenResponse;
      } catch (e) {
        if (e instanceof DbError) throw e;
        throw new DbError(e);
      }
    },

    async listTokens(organizationId: string): Promise<ApiTokenListResponse[]> {
      try {
        const tokens = await repo.findByOrganization(organizationId);

        return tokens.map((t) => ({
          id: t.id,
          name: t.name,
          organizationId: t.organizationId,
          lastUsedAt: t.lastUsedAt,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
        } satisfies ApiTokenListResponse));
      } catch (e) {
        if (e instanceof DbError) throw e;
        throw new DbError(e);
      }
    },

    async deleteToken(id: string, organizationId: string): Promise<void> {
      try {
        const existing = await repo.findById(id, organizationId);

        if (!existing) {
          throw new ApiTokenNotFoundError(id);
        }

        await repo.delete(id, organizationId);
      } catch (e) {
        if (e instanceof ApiTokenNotFoundError) throw e;
        if (e instanceof DbError) throw e;
        throw new DbError(e);
      }
    },

    async validateToken(tokenHash: string): Promise<{ organizationId: string; tokenId: string }> {
      try {
        const token = await repo.findByTokenHash(tokenHash);

        if (!token) {
          throw new ApiTokenNotFoundError('unknown');
        }

        // Check expiration
        if (token.expiresAt && token.expiresAt < new Date()) {
          throw new ApiTokenExpiredError();
        }

        // Update last used timestamp
        await repo.updateLastUsed(token.id);

        return {
          organizationId: token.organizationId,
          tokenId: token.id,
        };
      } catch (e) {
        if (e instanceof ApiTokenNotFoundError || e instanceof ApiTokenExpiredError) throw e;
        if (e instanceof DbError) throw e;
        throw new DbError(e);
      }
    },
  };
}
