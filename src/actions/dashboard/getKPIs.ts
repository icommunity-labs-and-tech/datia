'use server';

import type { DashboardKPIs } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    itemRepository,
  });
  return await dashboardService.getKPIs();
}

