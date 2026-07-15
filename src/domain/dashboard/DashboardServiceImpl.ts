import { DashboardService } from './DashboardService';
import type { DashboardKPIs, MonthlyActivity, CategoryDistribution, BackupStatus } from '@/types/dashboard';
import type { UserRepository } from '@/domain/users/UserRepository';
import type { ItemRepository } from '@/domain/items/ItemRepository';
import type { StateRepository } from '@/domain/states/StateRepository';
import type { CategoryRepository } from '@/domain/categories/CategoryRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';

export function createDashboardServiceImpl(deps: {
  userRepository: UserRepository;
  itemRepository: ItemRepository;
  stateRepository: StateRepository;
  categoryRepository: CategoryRepository;
}): DashboardService {
  const { userRepository: userRepo, itemRepository: itemRepo, stateRepository: stateRepo, categoryRepository: categoryRepo } = deps;

  return {
    async getKPIs(): Promise<DashboardKPIs> {
      try {
        const organizationId = await requireOrganizationId();
        
        const [
          totalItems,
          backedStates,
          totalStates,
          statesThisMonth,
          totalUsers,
          verifiedUsers,
          activePassports
        ] = await Promise.all([
          itemRepo.countTotalItems(organizationId),
          stateRepo.countBackedStates(organizationId),
          stateRepo.countTotalStates(organizationId),
          stateRepo.countStatesThisMonth(organizationId, new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
          userRepo.countActiveUsers(organizationId, 30),
          userRepo.countVerifiedUsers(organizationId),
          itemRepo.countActiveItems(organizationId, 90)
        ]);

        const pendingStates = totalStates - backedStates;
        const backupRate = totalStates > 0 ? (backedStates / totalStates) * 100 : 0;

        return {
          totalPassports: totalItems,
          backedPassports: backedStates,
          pendingPassports: pendingStates,
          activePassports,
          statesThisMonth,
          evidencesGenerated: totalStates,
          backupRate: Math.round(backupRate * 100) / 100,
          activeUsers: totalUsers,
          verifiedUsers,
        };
      } catch {
        return {
          totalPassports: 0,
          backedPassports: 0,
          pendingPassports: 0,
          activePassports: 0,
          statesThisMonth: 0,
          evidencesGenerated: 0,
          backupRate: 0,
          activeUsers: 0,
          verifiedUsers: 0,
        };
      }
    },

    async getMonthlyActivity(months = 12): Promise<MonthlyActivity[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const currentDate = new Date();
        const monthsData: Array<{ month: string; usersRegistered: number; itemsCreated: number }> = [];
        
        for (let i = months - 1; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
          
          const [usersCount, itemsCount] = await Promise.all([
            userRepo.countUsersByMonth(organizationId, date, nextMonth),
            itemRepo.countItemsByMonth(organizationId, date, nextMonth)
          ]);
          
          const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
          monthsData.push({ month: monthName, usersRegistered: usersCount, itemsCreated: itemsCount });
        }
        
        return monthsData as MonthlyActivity[];
      } catch {
        return [];
      }
    },

    async getCategoryDistribution(): Promise<CategoryDistribution[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const categories = await categoryRepo.getCategoriesWithItemCounts(organizationId);
        
        const totalItems = categories.reduce((sum, cat) => sum + cat._count.items, 0);
        
        return categories
          .map((category) => {
            const itemCount = category._count.items;
            return {
              category: category.name,
              itemCount,
              percentage: totalItems > 0 ? (itemCount / totalItems) * 100 : 0,
            };
          })
          .filter((cat) => cat.itemCount > 0) as CategoryDistribution[];
      } catch {
        return [];
      }
    },

    async getBackupStatus(): Promise<BackupStatus[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const itemsWithStates = await itemRepo.getItemsWithStatesForBackup(organizationId, currentMonth);
        
        return itemsWithStates
          .map((item) => {
            const statesCreated = item.states.length;
            const backedStates = item.states.filter((state) => state.backed).length;
            const pendingStates = statesCreated - backedStates;
            return {
              user: item.name,
              statesCreated,
              backedStates,
              pendingStates,
              total: statesCreated,
            };
          })
          .slice(0, 10) as BackupStatus[];
      } catch {
        return [];
      }
    },

    async getBackupStatusByUser(months: number = 1): Promise<BackupStatus[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const [users, statesByUser, backedStatesByUser] = await Promise.all([
          userRepo.listUsersForDashboard(organizationId),
          stateRepo.getStatesByUserGrouped(organizationId, startDate),
          stateRepo.getBackedStatesByUserGrouped(organizationId, startDate)
        ]);

        const totalStatesMap = new Map(statesByUser.map(s => [s.createdByUserId!, s._count.id]));
        const backedStatesMap = new Map(backedStatesByUser.map(s => [s.createdByUserId!, s._count.id]));
        
        return users.map(user => {
          const totalStates = totalStatesMap.get(user.id) || 0;
          const backedStates = backedStatesMap.get(user.id) || 0;
          const pendingStates = totalStates - backedStates;
          return { user: user.name, statesCreated: totalStates, backedStates, pendingStates, total: totalStates };
        }).filter(user => user.statesCreated > 0) as BackupStatus[];
      } catch {
        return [];
      }
    },
  };
}
