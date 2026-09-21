'use server';

import type { DashboardKPIs } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    itemRepository,
    categoryRepository,
  });
  return await dashboardService.getKPIs();
}

