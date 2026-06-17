'use server';

import type { BackupStatusByUser } from '@/types/dashboard';
import { createDashboardServiceImpl } from '@/domain/dashboard/DashboardServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';

export async function getBackupStatusByUser(months: number = 1): Promise<BackupStatusByUser[]> {
  const dashboardService = createDashboardServiceImpl({
    userRepository,
    itemRepository,
    stateRepository,
    categoryRepository,
  });
  
  if (dashboardService.getBackupStatusByUser) {
    const data = await dashboardService.getBackupStatusByUser(months);
    return data.map((d: any) => ({
      user: d.user,
      totalStates: d.total ?? d.statesCreated ?? 0,
      backedStates: d.backedStates,
      pendingStates: d.pendingStates,
    }));
  }
  return [];
}
