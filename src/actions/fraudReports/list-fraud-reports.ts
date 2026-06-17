'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';
import type { FraudReportStatus, FraudReportWithItem } from '@/domain/fraudReports/FraudReport';

export interface ListFraudReportsResult {
  success: boolean;
  data?: FraudReportWithItem[];
  pendingCount?: number;
  error?: string;
}

export async function listFraudReports(filters?: {
  status?: FraudReportStatus;
  itemId?: string;
}): Promise<ListFraudReportsResult> {
  try {
    const organizationId = await requireOrganizationId();
    const [data, pendingCount] = await Promise.all([
      fraudReportRepository.findByOrganization(organizationId, filters),
      fraudReportRepository.countPending(organizationId),
    ]);
    return { success: true, data, pendingCount };
  } catch (e) {
    console.error('[listFraudReports] Error:', e);
    return { success: false, error: 'Failed to load fraud reports' };
  }
}
