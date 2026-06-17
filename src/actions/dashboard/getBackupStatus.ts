'use server';

import type { BackupStatus } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function getBackupStatus(): Promise<BackupStatus[]> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    itemRepository,
    stateRepository,
    categoryRepository,
  });
  return await dashboardService.getBackupStatus();
}

