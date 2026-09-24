'use server';

import { requireScope } from '@/lib/auth/tenant';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

export async function listEnergyConsumption() {
  const scope = await requireScope();
  const service = createEnergyServiceImpl({ energyRepository });
  const result = await service.listConsumption(scope);
  return result.data;
}
