'use server';

import { requireScope } from '@/lib/auth/tenant';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

/** Totals over every consumption record, independent of the paginated listing. */
export async function getConsumptionTotals() {
  const scope = await requireScope();
  const service = createEnergyServiceImpl({ energyRepository });
  return service.getConsumptionTotals(scope);
}
