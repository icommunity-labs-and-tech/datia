import { DashboardService } from './DashboardService';
import type { DashboardKPIs, MonthlyActivity, CategoryDistribution } from '@/types/dashboard';
import type { UserRepository } from '@/domain/users/UserRepository';
import type { ItemRepository } from '@/domain/items/ItemRepository';
import type { CategoryRepository } from '@/domain/categories/CategoryRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { certificationCounts } from '@/lib/certification/queries';

export function createDashboardServiceImpl(deps: {
  userRepository: UserRepository;
  itemRepository: ItemRepository;
  categoryRepository: CategoryRepository;
}): DashboardService {
  const { userRepository: userRepo, itemRepository: itemRepo, categoryRepository: categoryRepo } = deps;

  return {
    async getKPIs(): Promise<DashboardKPIs> {
      try {
        const organizationId = await requireOrganizationId();

        const [totalItems, activeItems, certifications, totalUsers, verifiedUsers] = await Promise.all([
          itemRepo.countTotalItems(organizationId),
          itemRepo.countActiveItems(organizationId, 90),
          certificationCounts(organizationId),
          userRepo.countActiveUsers(organizationId, 30),
          userRepo.countVerifiedUsers(organizationId),
        ]);

        return {
          totalItems,
          activeItems,
          certifications: certifications.total,
          certifiedCertifications: certifications.certified,
          issuedCertifications: certifications.issued,
          certificationsThisMonth: certifications.thisMonth,
          activeUsers: totalUsers,
          verifiedUsers,
        };
      } catch {
        return {
          totalItems: 0,
          activeItems: 0,
          certifications: 0,
          certifiedCertifications: 0,
          issuedCertifications: 0,
          certificationsThisMonth: 0,
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

  };
}
