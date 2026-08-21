'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

/** Totals over every emission record, independent of the paginated listing. */
export async function getEmissionTotals() {
  const organizationId = await requireOrganizationId();
  const service = createEnergyServiceImpl({ energyRepository });
  return service.getEmissionTotals(organizationId);
}
