import DashboardMantine from '../DashboardMantine';
import { getDashboardKPIs, getEnergySummary } from '@/actions/dashboard';
import { listEnergySources } from '@/actions/energy/list-sources';

export const dynamic = 'force-dynamic';

export default async function DashboardIndexPage() {
  const [kpis, energySummary, sourcesResult] = await Promise.all([
    getDashboardKPIs(),
    getEnergySummary(),
    listEnergySources(),
  ]);

  return (
    <DashboardMantine
      kpis={kpis}
      energySummary={energySummary}
      energySources={sourcesResult ?? []}
    />
  );
}
