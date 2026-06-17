'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

export async function listEnergyConsumption() {
  const organizationId = await requireOrganizationId();
  const service = createEnergyServiceImpl({ energyRepository });
  const result = await service.listConsumption(organizationId);
  return result.data;
}
