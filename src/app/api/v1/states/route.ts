import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

/**
 * @swagger
 * /states:
 *   get:
 *     summary: List all states
 *     description: Retrieves a list of all states in the system. Requires a valid API token.
 *     tags:
 *       - States
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter states by product ID (optional)
 *         example: PROD-001
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ID of the last state from previous page)
 *         example: state-001
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of states to return
 *         example: 20
 *     responses:
 *       '200':
 *         description: List of states retrieved successfully (paginated)
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
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       statusTypeId:
 *                         type: string
 *                       itemId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       evidenceID:
 *                         type: string
 *                         nullable: true
 *                       backed:
 *                         type: boolean
 *                         nullable: true
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the last state in this page, use this as cursor for next page
 *                   example: state-020
 *                 hasNextPage:
 *                   type: boolean
 *                   description: Whether there are more states available
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
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API token
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const paginationParams = parseCursorPaginationParams(searchParams);

    const { getStatesPaginated } = await import('@/actions/states/listPaginated');
    const result = await getStatesPaginated({
      ...paginationParams,
      itemId: itemId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching states:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

