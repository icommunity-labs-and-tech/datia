import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: List all categories
 *     description: Retrieves a list of all categories in the system with pagination. Requires a valid API token.
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ID of the last category from previous page)
 *         example: category-001
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of categories to return
 *         example: 20
 *     responses:
 *       '200':
 *         description: List of categories retrieved successfully (paginated)
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
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       itemTemplate:
 *                         type: array
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the last category in this page, use this as cursor for next page
 *                   example: category-020
 *                 hasNextPage:
 *                   type: boolean
 *                   description: Whether there are more categories available
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
    const paginationParams = parseCursorPaginationParams(searchParams);

    const { getCategoriesPaginated } = await import('@/actions/categories/listPaginated');
    const result = await getCategoriesPaginated(paginationParams);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

