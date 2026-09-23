import { DashboardService } from './DashboardService';
import type { DashboardKPIs, MonthlyActivity } from '@/types/dashboard';
import type { UserRepository } from '@/domain/users/UserRepository';
import type { AssetRepository } from '@/domain/assets/AssetRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { certificationCounts } from '@/lib/certification/queries';

export function createDashboardServiceImpl(deps: {
  userRepository: UserRepository;
  assetRepository: AssetRepository;
}): DashboardService {
  const { userRepository: userRepo, assetRepository: itemRepo } = deps;

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


  };
}
