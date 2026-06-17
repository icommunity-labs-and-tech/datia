'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';
import type { FraudReportStatus } from '@/domain/fraudReports/FraudReport';

export interface UpdateFraudReportResult {
  success: boolean;
  error?: string;
}

export async function updateFraudReportStatus(
  reportId: string,
  status: FraudReportStatus,
): Promise<UpdateFraudReportResult> {
  try {
    const organizationId = await requireOrganizationId();
    await fraudReportRepository.update(reportId, organizationId, { status });
    return { success: true };
  } catch (e) {
    console.error('[updateFraudReportStatus] Error:', e);
    return { success: false, error: 'Failed to update report' };
  }
}

export async function getFraudReport(reportId: string) {
  try {
    const organizationId = await requireOrganizationId();
    const report = await fraudReportRepository.findById(reportId, organizationId);
    if (!report) return { success: false, error: 'Not found' };
    return { success: true, data: report };
  } catch (e) {
    console.error('[getFraudReport] Error:', e);
    return { success: false, error: 'Failed to load report' };
  }
}
