import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { stateRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/StateRepositoryFilesystem';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';
import { StatusTypeNotFoundError } from '@/domain/status-types/errors';

/**
 * @swagger
 * /api/v1/products/{id}/states:
 *   post:
 *     summary: Add a state to a product
 *     tags:
 *       - Products
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: string
 *     responses:
 *       '201':
 *         description: State created successfully
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Product or status type not found
 *       '422':
 *         description: Validation error
 *       '501':
 *         description: Not implemented (production only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { id: itemId } = await params;
    const { organizationId } = auth;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    const { statusTypeId, templateConfig } = body;

    if (!statusTypeId || typeof statusTypeId !== 'string') {
      return NextResponse.json(
        { error: 'Field "statusTypeId" is required', code: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    // Status types are always read from real DB (they are org configuration, not sandbox data)
    let statusType: { id: string; name: string; description: string | null };
    try {
      statusType = await statusTypeRepository.getById(statusTypeId, organizationId);
    } catch (err) {
      if (err instanceof StatusTypeNotFoundError) {
        return NextResponse.json(
          { error: `Status type "${statusTypeId}" not found`, code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      throw err;
    }

    // ── Sandbox: write to filesystem, no evidence/blockchain ─────────────
    if (auth.isSandbox) {
      const state = await stateRepositoryFilesystem.create({
        title: statusType.name,
        description: '',
        statusTypeId: statusType.id,
        itemId,
        templateConfig: templateConfig ?? null,
        createdByUserId: 'sandbox',
        // Extra fields consumed by the filesystem repo for denormalized storage
        ...({ organizationId, statusTypeName: statusType.name, statusTypeDescription: statusType.description } as any),
      });

      return NextResponse.json(
        {
          id: state.id,
          title: state.title,
          statusTypeId: state.statusTypeId,
          itemId: state.itemId,
          templateConfig,
          createdAt: state.createdAt,
        },
        { status: 201 }
      );
    }

    // ── Production: not yet implemented ──────────────────────────────────
    return NextResponse.json(
      {
        error: 'Not Implemented',
        code: 'NOT_IMPLEMENTED',
        message:
          'State creation via API is not yet available in production. Use the sandbox environment to test this endpoint.',
        details: { itemId, statusTypeId },
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in states API endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
