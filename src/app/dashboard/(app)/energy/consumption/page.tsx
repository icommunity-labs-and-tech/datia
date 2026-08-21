import { EnergyConsumption } from '@/components/energy/EnergyViews';
import { listEnergySources } from '@/actions/energy/list-sources';
import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyConsumptionPage() {
  const t = await getTranslations('energyHub');
  const [sources, consumption] = await Promise.all([
    listEnergySources(),
    listEnergyConsumption(),
  ]);

  return (
    <>
      <PageHeader title={t('tabs.consumption')} description={t('consumptionTab.description')} />
      <EnergyConsumption consumption={consumption ?? []} sources={sources ?? []} />
    </>
  );
}
