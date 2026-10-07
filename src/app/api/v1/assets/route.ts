import { NextRequest, NextResponse } from 'next/server';
import { createAssetServiceImpl } from '@/domain/assets/AssetServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { assetRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/AssetRepositoryFilesystem';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { authScope } from '@/lib/scope';
import { AssetInputError, AssetAlreadyExistsError, UserNotVerifiedError, CompanyNotVerifiedError, AssetCreationRollbackError } from '@/domain/assets/errors';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const paginationParams = parseCursorPaginationParams(searchParams);

    // ── Sandbox: read from filesystem only ──────────────────────────────
    if (auth.isSandbox) {
      const repo = assetRepositoryFilesystem;
      let result;
      if (q) {
        result = await repo.searchPaginated(q, authScope(auth), paginationParams);
      } else {
        result = await repo.listPaginated(authScope(auth), paginationParams);
      }
      return NextResponse.json(result);
    }

    // ── Production ────────────────────────────────────────────────────
    // Scoped by the token that authenticated this request, not by whatever
    // dashboard cookie the caller's browser happens to also be carrying — the
    // server actions this used to delegate to read the latter via
    // `requireScope()`, the same bug #78 already fixed for /api/v1/events.
    let result;
    if (q) {
      result = await assetRepository.searchPaginated(q, authScope(auth), paginationParams);
    } else {
      result = await assetRepository.listPaginated(authScope(auth), paginationParams);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate API token and get organization context
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const scope = authScope(auth);

    // Parse request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Field "name" is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'Field "description" is required and must be a string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.id || typeof body.id !== 'string' || !body.id.trim()) {
      return NextResponse.json(
        { error: 'Field "id" is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Build request
    const createRequest = {
      name: body.name.trim(),
      description: body.description.trim(),
      customId: body.id.trim(),
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
      // Position is a field of the asset since #37, not a template entry.
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
    };

    // ── Sandbox: write to filesystem, skip evidence service ─────────────
    if (auth.isSandbox) {
      const existing = await assetRepositoryFilesystem.getById(createRequest.customId, scope);
      if (existing) {
        return NextResponse.json(
          { error: `Asset with ID "${createRequest.customId}" already exists in the sandbox`, code: 'ASSET_EXISTS' },
          { status: 409 }
        );
      }
      const sandboxItem = await assetRepositoryFilesystem.create({
        id: createRequest.customId,
        scope,
        name: createRequest.name,
        description: createRequest.description,
        imageUrl: createRequest.imageUrl ?? null,
        createdByUserId: 'sandbox',
      });
      return NextResponse.json(
        {
          id: sandboxItem.id,
          name: sandboxItem.name,
          description: sandboxItem.description,
          imageUrl: sandboxItem.imageUrl,
          latitude: sandboxItem.latitude,
          longitude: sandboxItem.longitude,
        },
        { status: 201 }
      );
    }

    // ── Production: full service with evidence ───────────────────────────
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const itemService = createAssetServiceImpl({
      assetRepository,
      userRepository,
      evidenceService,
    });

    // The organization comes from the token and travels with the call. It used
    // to be parked in module state for the length of the request, where every
    // concurrent request on the instance read it as its own (#30). A token has
    // no person behind it, so the asset has no creator.
    const result = await itemService.createAsset(scope, { ...createRequest, createdByUserId: null });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Map domain errors to HTTP responses
    if (error instanceof AssetInputError) {
      return NextResponse.json(
        { error: error.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (error instanceof AssetAlreadyExistsError) {
      return NextResponse.json(
        { error: error.message, code: 'ASSET_EXISTS' },
        { status: 409 }
      );
    }
    if (error instanceof UserNotVerifiedError) {
      return NextResponse.json(
        { error: 'User verification required', code: 'USER_NOT_VERIFIED' },
        { status: 403 }
      );
    }
    // The company's KYC (#23) replaced this, and the route was never updated to
    // catch it — it fell through to the generic 500 below (#38).
    if (error instanceof CompanyNotVerifiedError) {
      return NextResponse.json(
        { error: error.message, code: 'ACCOUNT_NOT_VERIFIED' },
        { status: 403 }
      );
    }
    if (error instanceof AssetCreationRollbackError) {
      return NextResponse.json(
        { error: error.message, code: 'CREATION_FAILED' },
        { status: 500 }
      );
    }

    console.error('Error creating asset via API:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

