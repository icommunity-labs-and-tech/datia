'use server';

import type { MonthlyActivity } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';

export async function getMonthlyActivity(months: number = 12): Promise<MonthlyActivity[]> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    itemRepository,
  });
  return await dashboardService.getMonthlyActivity(months);
}

