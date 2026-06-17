import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';
import type { FraudReportStatus } from '@/domain/fraudReports/FraudReport';
import { FraudReportCreationError } from '@/domain/fraudReports/errors';

const VALID_STATUSES: FraudReportStatus[] = ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'];

/**
 * @swagger
 * /fraud-reports:
 *   get:
 *     summary: List fraud reports
 *     description: Retrieves a list of fraud reports for the organization. Optionally filter by status or product ID. Requires a valid API token.
 *     tags:
 *       - FraudReports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *         description: Filter reports by status (optional)
 *         example: PENDING
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter reports by product ID (optional)
 *         example: PROD-001
 *     responses:
 *       '200':
 *         description: List of fraud reports retrieved successfully
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
 *                         example: clxyz123
 *                       itemId:
 *                         type: string
 *                         example: ITEM-001
 *                       item:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                             nullable: true
 *                       status:
 *                         type: string
 *                         enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *                         example: PENDING
 *                       acquiredAt:
 *                         type: string
 *                         nullable: true
 *                         example: 2024-01-15
 *                       locationName:
 *                         type: string
 *                         nullable: true
 *                         example: Madrid, España
 *                       latitude:
 *                         type: number
 *                         nullable: true
 *                         example: 40.4168
 *                       longitude:
 *                         type: number
 *                         nullable: true
 *                         example: -3.7038
 *                       comments:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of reports returned
 *                   example: 12
 *       '400':
 *         description: Bad request - invalid filter value
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
 *       '500':
 *         description: Internal server error
 *   post:
 *     summary: Create a fraud report
 *     description: Creates a new fraud report for a product in the organization. Requires a valid API token. This is typically submitted from the Digital Passport app when a user reports a counterfeit product.
 *     tags:
 *       - FraudReports
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item being reported as fraudulent
 *                 example: ITEM-001
 *               acquiredAt:
 *                 type: string
 *                 description: Date when the item was acquired (optional)
 *                 example: 2024-01-15
 *               latitude:
 *                 type: number
 *                 description: Latitude of the reported location (optional)
 *                 example: 40.4168
 *               longitude:
 *                 type: number
 *                 description: Longitude of the reported location (optional)
 *                 example: -3.7038
 *               locationName:
 *                 type: string
 *                 description: Human-readable name of the reported location (optional)
 *                 example: Madrid, España
 *               comments:
 *                 type: string
 *                 description: Additional comments from the reporter (optional)
 *                 example: Purchased at a street market, packaging looks fake
 *     responses:
 *       '201':
 *         description: Fraud report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: clxyz123
 *                 itemId:
 *                   type: string
 *                   example: ITEM-001
 *                 organizationId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *                   example: PENDING
 *                 acquiredAt:
 *                   type: string
 *                   nullable: true
 *                 locationName:
 *                   type: string
 *                   nullable: true
 *                 latitude:
 *                   type: number
 *                   nullable: true
 *                 longitude:
 *                   type: number
 *                   nullable: true
 *                 comments:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Bad request - missing required fields
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

    const { organizationId } = auth;
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const itemId = searchParams.get('itemId') ?? undefined;

    if (statusParam && !VALID_STATUSES.includes(statusParam as FraudReportStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const status = statusParam as FraudReportStatus | undefined;
    const reports = await fraudReportRepository.findByOrganization(organizationId, { status, itemId });

    return NextResponse.json({ data: reports, total: reports.length });
  } catch (error) {
    console.error('Error fetching fraud reports:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { organizationId } = auth;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    if (!body.itemId || typeof body.itemId !== 'string' || !body.itemId.trim()) {
      return NextResponse.json(
        { error: 'Field "itemId" is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const report = await fraudReportRepository.create({
      itemId: body.itemId.trim(),
      organizationId,
      acquiredAt: typeof body.acquiredAt === 'string' ? body.acquiredAt : undefined,
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
      locationName: typeof body.locationName === 'string' ? body.locationName : undefined,
      comments: typeof body.comments === 'string' ? body.comments : undefined,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof FraudReportCreationError) {
      return NextResponse.json(
        { error: 'Failed to create fraud report', code: 'CREATION_FAILED' },
        { status: 500 }
      );
    }
    console.error('Error creating fraud report:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
