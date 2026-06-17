import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { getState } from '@/actions/states';

/**
 * @swagger
 * /states/{id}:
 *   get:
 *     summary: Get a state by ID
 *     description: Retrieves detailed information about a specific state. Requires a valid API token.
 *     tags:
 *       - States
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the state
 *         example: state-001
 *     responses:
 *       '200':
 *         description: State retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 statusTypeId:
 *                   type: string
 *                 itemId:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
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
 *       '404':
 *         description: State not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate API token
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const state = await getState(id);
    
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json(
      { error: 'Estado no encontrado' },
      { status: 404 }
    );
  }
}

