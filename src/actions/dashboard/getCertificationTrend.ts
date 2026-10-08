'use server';

import { requireScope } from '@/lib/auth/tenant';
import { computeCertificationTrend } from '@/lib/dashboard/certificationTrend';

export async function getCertificationTrend() {
  const scope = await requireScope();
  return computeCertificationTrend(scope);
}
