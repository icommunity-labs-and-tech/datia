'use server';

import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';
import { FraudReportCreationError, FraudReportItemNotFoundError } from '@/domain/fraudReports/errors';
import { prisma } from '@/lib/prisma';

export interface CreateFraudReportParams {
  itemId: string;
  acquiredAt?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  comments?: string;
  imageUrls?: string[];
}

export interface CreateFraudReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

export async function createFraudReport(params: CreateFraudReportParams): Promise<CreateFraudReportResult> {
  try {
    // Look up item to get organizationId (no auth required — public endpoint)
    const item = await prisma.item.findUnique({
      where: { id: params.itemId },
      select: { id: true, organizationId: true },
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const report = await fraudReportRepository.create({
      itemId: item.id,
      organizationId: item.organizationId,
      acquiredAt: params.acquiredAt,
      latitude: params.latitude,
      longitude: params.longitude,
      locationName: params.locationName,
      comments: params.comments,
      imageUrls: params.imageUrls,
    });

    return { success: true, reportId: report.id };
  } catch (e) {
    if (e instanceof FraudReportItemNotFoundError) {
      return { success: false, error: 'Item not found' };
    }
    if (e instanceof FraudReportCreationError) {
      return { success: false, error: 'Failed to create report' };
    }
    console.error('[createFraudReport] Unexpected error:', e);
    return { success: false, error: 'Unexpected error' };
  }
}
