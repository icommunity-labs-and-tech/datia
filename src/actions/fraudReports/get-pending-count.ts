'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { fraudReportRepository } from '@/infrastructure/repositories/FraudReportRepositoryImpl';

export async function getFraudReportsPendingCount(): Promise<number> {
  try {
    const organizationId = await requireOrganizationId();
    return await fraudReportRepository.countPending(organizationId);
  } catch {
    return 0;
  }
}
