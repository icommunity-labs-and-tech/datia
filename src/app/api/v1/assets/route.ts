import { NextRequest, NextResponse } from 'next/server';
import { createAssetServiceImpl } from '@/domain/assets/AssetServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { assetRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/AssetRepositoryFilesystem';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { AssetInputError, AssetAlreadyExistsError, UserNotVerifiedError, AssetCreationRollbackError } from '@/domain/assets/errors';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all products
 *     description: Retrieves a list of all products in the system. Requires a valid API token.
 *     tags:
 *       - Products
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query to filter products by name or ID (optional)
 *         example: solar
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ID of the last product from previous page)
 *         example: PROD-001
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of products to return
 *         example: 20
 *     responses:
 *       '200':
 *         description: List of products retrieved successfully (paginated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: PROD-001
 *                       name:
 *                         type: string
 *                         example: Solar Panel 300W
 *                       description:
 *                         type: string
 *                         example: High efficiency solar panel
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the last product in this page, use this as cursor for next page
 *                   example: PROD-020
 *                 hasNextPage:
 *                   type: boolean
 *                   description: Whether there are more products available
 *                   example: true
 *       '401':
 *         description: Unauthorized - invalid or missing API token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *   post:
 *     summary: Create a new product
 *     description: Creates a new product in the system. Requires a valid API token.
 *     tags:
 *       - Products
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - description
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the product
 *                 example: PROD-001
 *               name:
 *                 type: string
 *                 description: Name of the product
 *                 example: Solar Panel 300W
 *               description:
 *                 type: string
 *                 description: Description of the product
 *                 example: High efficiency solar panel
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of the product image
 *                 example: https://example.com/image.jpg
 *                 type: object
 *                 description: Additional template fields
 *                 additionalProperties: true
 *                 type: array
 *                 description: Product template configuration
 *                 items:
 *                   type: object
 *     responses:
 *       '201':
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *                   nullable: true
 *                   type: array
 *                   nullable: true
 *       '400':
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *       '401':
 *         description: Unauthorized - invalid or missing API token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *       '409':
 *         description: Conflict - product with this ID already exists
 *       '500':
 *         description: Internal server error
 */
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
        result = await repo.searchPaginated(q, auth.organizationId, paginationParams);
      } else {
        result = await repo.listPaginated(auth.organizationId, paginationParams);
      }
      return NextResponse.json(result);
    }

    // ── Production: delegate to server actions (Prisma) ─────────────────
    let result;
    if (q) {
      const { searchAssetsPaginated } = await import('@/actions/assets/searchPaginated');
      result = await searchAssetsPaginated(q, paginationParams);
    } else {
      const { getAssetsPaginated } = await import('@/actions/assets/listPaginated');
      result = await getAssetsPaginated(paginationParams);
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

    const { organizationId } = auth;

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
      const existing = await assetRepositoryFilesystem.getById(createRequest.customId, organizationId);
      if (existing) {
        return NextResponse.json(
          { error: `Item with ID "${createRequest.customId}" already exists in the sandbox`, code: 'ITEM_EXISTS' },
          { status: 409 }
        );
      }
      const sandboxItem = await assetRepositoryFilesystem.create({
        id: createRequest.customId,
        organizationId,
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
    // no person behind it, so the item has no creator.
    const result = await itemService.createAsset(organizationId, { ...createRequest, createdByUserId: null });
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
        { error: error.message, code: 'ITEM_EXISTS' },
        { status: 409 }
      );
    }
    if (error instanceof UserNotVerifiedError) {
      return NextResponse.json(
        { error: 'User verification required', code: 'USER_NOT_VERIFIED' },
        { status: 403 }
      );
    }
    if (error instanceof AssetCreationRollbackError) {
      return NextResponse.json(
        { error: error.message, code: 'CREATION_FAILED' },
        { status: 500 }
      );
    }

    console.error('Error creating item via API:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

