import { NextRequest, NextResponse } from 'next/server';
import { withApiTracking } from '@/lib/auth/api-tokens/withApiTracking';
import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';
import type { FraudReportStatus } from '@/domain/fraudReports/FraudReport';

const VALID_STATUSES: FraudReportStatus[] = ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'];

/**
 * @swagger
 * /fraud-reports/{id}:
 *   get:
 *     summary: Get a fraud report by ID
 *     description: Retrieves detailed information about a specific fraud report. Requires a valid API token.
 *     tags:
 *       - FraudReports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the fraud report
 *         example: clxyz123
 *     responses:
 *       '200':
 *         description: Fraud report retrieved successfully
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
 *                 item:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                       nullable: true
 *                 status:
 *                   type: string
 *                   enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *                   example: PENDING
 *                 acquiredAt:
 *                   type: string
 *                   nullable: true
 *                   example: 2024-01-15
 *                 locationName:
 *                   type: string
 *                   nullable: true
 *                   example: Madrid, España
 *                 latitude:
 *                   type: number
 *                   nullable: true
 *                   example: 40.4168
 *                 longitude:
 *                   type: number
 *                   nullable: true
 *                   example: -3.7038
 *                 comments:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
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
 *         description: Fraud report not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *   patch:
 *     summary: Update a fraud report status
 *     description: Updates the status of a specific fraud report. Requires a valid API token.
 *     tags:
 *       - FraudReports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the fraud report
 *         example: clxyz123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *                 description: New status for the fraud report
 *                 example: CONFIRMED
 *     responses:
 *       '200':
 *         description: Fraud report status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, UNDER_REVIEW, CONFIRMED, DISMISSED]
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Bad request - invalid status value
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
 *       '404':
 *         description: Fraud report not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *   delete:
 *     summary: Delete a fraud report
 *     description: Permanently deletes a fraud report. Requires a valid API token.
 *     tags:
 *       - FraudReports
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the fraud report
 *         example: clxyz123
 *     responses:
 *       '204':
 *         description: Fraud report deleted successfully
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
 *         description: Fraud report not found
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
export const GET = withApiTracking(async (
  _request: NextRequest,
  auth,
  params: { id: string }
) => {
  try {
    const report = await fraudReportRepository.findById(params.id, auth.organizationId);
    if (!report) {
      return NextResponse.json(
        { error: 'Fraud report not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching fraud report:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

export const PATCH = withApiTracking(async (
  request: NextRequest,
  auth,
  params: { id: string }
) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.status) {
      return NextResponse.json(
        { error: 'Field "status" is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(body.status as FraudReportStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const report = await fraudReportRepository.update(
      params.id,
      auth.organizationId,
      { status: body.status as FraudReportStatus }
    );

    return NextResponse.json(report);
  } catch (error: any) {
    if (error?._tag === 'FraudReportNotFoundError' || error?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Fraud report not found' },
        { status: 404 }
      );
    }
    console.error('Error updating fraud report:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

export const DELETE = withApiTracking(async (
  _request: NextRequest,
  auth,
  params: { id: string }
) => {
  try {
    await fraudReportRepository.delete(params.id, auth.organizationId);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?._tag === 'FraudReportNotFoundError' || error?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Fraud report not found' },
        { status: 404 }
      );
    }
    console.error('Error deleting fraud report:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
