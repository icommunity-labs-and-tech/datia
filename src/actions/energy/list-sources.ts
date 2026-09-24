'use server';

import { requireScope } from '@/lib/auth/tenant';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

export async function listEnergySources() {
  const scope = await requireScope();
  const service = createEnergyServiceImpl({ energyRepository });
  const result = await service.listSources(scope);
  return result.data;
}
