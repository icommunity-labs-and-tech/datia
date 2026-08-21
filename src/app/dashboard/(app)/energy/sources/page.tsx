import { EnergySourcesMap } from '@/components/energy/EnergyViews';
import { listEnergySources } from '@/actions/energy/list-sources';
import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergySourcesPage() {
  const t = await getTranslations('energyHub');
  // The map plots each source and its consumption; emissions are not needed here.
  const [sources, consumption] = await Promise.all([
    listEnergySources(),
    listEnergyConsumption(),
  ]);

  return (
    <>
      <PageHeader title={t('tabs.map')} description={t('mapTab.description')} />
      <EnergySourcesMap sources={sources ?? []} consumption={consumption ?? []} />
    </>
  );
}
