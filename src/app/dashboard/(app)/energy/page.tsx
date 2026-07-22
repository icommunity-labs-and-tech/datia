import EnergyHubClient from '@/components/energy/EnergyHubClient';
import { listEnergySources } from '@/actions/energy/list-sources';
import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import { listEmissions } from '@/actions/energy/list-emissions';

export const dynamic = 'force-dynamic';

export default async function EnergyHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const [sources, consumption, emissions] = await Promise.all([
    listEnergySources(),
    listEnergyConsumption(),
    listEmissions(),
  ]);

  return (
    <EnergyHubClient
      sources={sources ?? []}
      consumption={consumption ?? []}
      emissions={emissions ?? []}
      defaultTab={params.tab ?? 'map'}
    />
  );
}
