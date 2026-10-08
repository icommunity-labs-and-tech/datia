'use server';

import { requireScope } from '@/lib/auth/tenant';
import { computeEnergySummary } from '@/lib/dashboard/energySummary';

export async function getEnergySummary() {
  const scope = await requireScope();
  return computeEnergySummary(scope);
}
