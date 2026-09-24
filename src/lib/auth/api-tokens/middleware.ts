import { NextRequest, NextResponse } from 'next/server';
import { createApiTokenServiceImpl } from '@/domain/api-tokens/ApiTokenServiceImpl';
import { apiTokenRepository } from '@/infrastructure/prisma/repositories/ApiTokenRepositoryPrisma';
import { apiTokenRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/ApiTokenRepositoryFilesystem';
import type { ApiTokenRepository } from '@/domain/api-tokens/ApiTokenRepository';
import { ApiTokenNotFoundError, ApiTokenExpiredError } from '@/domain/api-tokens/ApiTokenService';
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export interface ApiTokenAuthResult {
  organizationId: string;
  /** The company the token acts for; null for a token issued at organisation level. */
  companyId: string | null;
  tokenId: string;
  /** True when authenticated via the sandbox (filesystem) repository. */
  isSandbox: boolean;
}

export interface ApiTokenValidatorDeps {
  /** Checked first — sandbox/filesystem store. */
  sandboxRepository: ApiTokenRepository;
  /** Fallback — real database. */
  productionRepository: ApiTokenRepository;
}

/**
 * Factory that creates a `validateApiToken` function with its repository
 * dependencies injected. Checks the sandbox repo first; if the token is not
 * found there, falls through to the production repo.
 */
export function createApiTokenValidator(deps: ApiTokenValidatorDeps) {
  const { sandboxRepository, productionRepository } = deps;

  return async function validateApiToken(
    request: NextRequest
  ): Promise<ApiTokenAuthResult | null> {
    const token = extractBearerToken(request);
    if (!token) return null;

    const tokenHash = hashToken(token);

    // ── 1. Sandbox store ──────────────────────────────────────────────────
    try {
      const result = await createApiTokenServiceImpl({ apiTokenRepository: sandboxRepository })
        .validateToken(tokenHash);
      return { ...result, isSandbox: true };
    } catch (err) {
      if (!(err instanceof ApiTokenNotFoundError) && !(err instanceof ApiTokenExpiredError)) {
        console.warn('[sandbox] Unexpected error checking sandbox token store:', err);
      }
      // Not a sandbox token — fall through
    }

    // ── 2. Production store ───────────────────────────────────────────────
    try {
      const result = await createApiTokenServiceImpl({ apiTokenRepository: productionRepository })
        .validateToken(tokenHash);
      return { ...result, isSandbox: false };
    } catch (err) {
      if (!(err instanceof ApiTokenNotFoundError) && !(err instanceof ApiTokenExpiredError)) {
        console.error('Unexpected error validating API token:', err);
      }
      return null;
    }
  };
}

/**
 * Default validator instance wired with the filesystem sandbox repo and the
 * Prisma production repo. Import this for use in route handlers and middleware.
 */
export const validateApiToken = createApiTokenValidator({
  sandboxRepository: apiTokenRepositoryFilesystem,
  productionRepository: apiTokenRepository,
});

/**
 * Middleware helper — returns null if auth succeeds, or a 401 NextResponse.
 */
export async function requireApiAuth(request: NextRequest): Promise<NextResponse | null> {
  const auth = await validateApiToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized', code: 'INVALID_TOKEN' }, { status: 401 });
  }
  return null;
}
