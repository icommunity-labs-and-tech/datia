import DashboardMantine from '../DashboardMantine';
import { getDashboardKPIs, getEnergySummary, getCertificationTrend } from '@/actions/dashboard';
import { getAssets } from '@/actions/assets';

export const dynamic = 'force-dynamic';

export default async function DashboardIndexPage() {
  const [kpis, energySummary, items, trend] = await Promise.all([
    getDashboardKPIs(),
    getEnergySummary(),
    getAssets().catch(() => []),
    // The series the page is built around; an organisation without the module
    // simply has none, and the layout falls back to the catalogue.
    getCertificationTrend().catch(() => undefined),
  ]);

  const recentItems = items.slice(0, 5).map((item) => ({
    id: item.id,
    name: item.name,
    certified: item.certified,
  }));

  return (
    <DashboardMantine
      kpis={kpis}
      trend={trend}
      energySummary={energySummary}
      recentItems={recentItems}
    />
  );
}
