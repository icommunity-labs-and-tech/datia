import DashboardClient from '../DashboardView';
import { getDashboardKPIs, getMonthlyActivity, getCategoryDistribution, getBackupStatus } from '@/actions/dashboard';
import { getCategoriesWithItemCount } from '@/actions/categories';

export const dynamic = 'force-dynamic';

export default async function DashboardIndexPage() {
  const [kpis, monthlyActivity, categoryDistribution, backupStatus, categoriesResult] = await Promise.all([
    getDashboardKPIs(),
    getMonthlyActivity(12),
    getCategoryDistribution(),
    getBackupStatus(),
    getCategoriesWithItemCount(),
  ]);

  const pieData = categoriesResult.success ?
    categoriesResult.categories
      .map((c: any) => ({ name: c.name, value: c.itemCount || 0 }))
      .filter((d: { name: string; value: number }) => d.value > 0) :
    [];

  return (
    <DashboardClient
      pieData={pieData}
      kpis={kpis}
      monthlyActivity={monthlyActivity}
      categoryDistribution={categoryDistribution}
      backupStatus={backupStatus}
      backupStatusByUser={[]}
    />
  );
}
