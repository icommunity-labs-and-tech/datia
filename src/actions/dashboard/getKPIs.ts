'use server';

import type { DashboardKPIs } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    assetRepository,
  });
  return await dashboardService.getKPIs();
}

