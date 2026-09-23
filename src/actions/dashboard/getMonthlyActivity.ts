'use server';

import type { MonthlyActivity } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';

export async function getMonthlyActivity(months: number = 12): Promise<MonthlyActivity[]> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    assetRepository,
  });
  return await dashboardService.getMonthlyActivity(months);
}

