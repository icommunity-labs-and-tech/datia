import type { DashboardKPIs, MonthlyActivity } from '@/types/dashboard';
import type { UserRepository } from '@/domain/users/UserRepository';
import type { AssetRepository } from '@/domain/assets/AssetRepository';

export interface DashboardService {
  getKPIs(): Promise<DashboardKPIs>;
  getMonthlyActivity(months?: number): Promise<MonthlyActivity[]>;
}
