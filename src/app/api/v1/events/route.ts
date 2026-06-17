import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events
 *     description: Retrieves a list of all events in the system with pagination. Requires a valid API token.
 *     tags:
 *       - Events
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ID of the last event from previous page)
 *         example: event-001
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of events to return
 *         example: 20
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter events by event type (optional)
 *         example: product.created
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter events by entity type (optional)
 *         example: Product
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter events by entity ID (optional)
 *         example: PROD-001
 *     responses:
 *       '200':
 *         description: List of events retrieved successfully (paginated)
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
 *                       organizationId:
 *                         type: string
 *                       eventType:
 *                         type: string
 *                       entityType:
 *                         type: string
 *                       entityId:
 *                         type: string
 *                       data:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the last event in this page, use this as cursor for next page
 *                   example: event-020
 *                 hasNextPage:
 *                   type: boolean
 *                   description: Whether there are more events available
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
    const eventType = searchParams.get('eventType') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;

    const { getEventsPaginated } = await import('@/actions/events/listPaginated');
    const result = await getEventsPaginated({
      ...paginationParams,
      eventType,
      entityType,
      entityId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

