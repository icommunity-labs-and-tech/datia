import type { DashboardKPIs, MonthlyActivity, CategoryDistribution } from '@/types/dashboard';
import type { UserRepository } from '@/domain/users/UserRepository';
import type { ItemRepository } from '@/domain/items/ItemRepository';
import type { CategoryRepository } from '@/domain/categories/CategoryRepository';

export interface DashboardService {
  getKPIs(): Promise<DashboardKPIs>;
  getMonthlyActivity(months?: number): Promise<MonthlyActivity[]>;
  getCategoryDistribution(): Promise<CategoryDistribution[]>;
}
