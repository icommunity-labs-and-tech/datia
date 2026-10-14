import { EnergyConsumption } from '@/components/energy/EnergyViews';
import { listEnergySources } from '@/actions/energy/list-sources';
import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import { getConsumptionTotals } from '@/actions/energy/get-consumption-totals';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyConsumptionPage() {
  const t = await getTranslations('energyHub');
  // The listing is paginated; the totals cover every record.
  const [sources, consumption, totals, forecast] = await Promise.all([
    listEnergySources(),
    listEnergyConsumption(),
    getConsumptionTotals(),
    getEnergyForecast(6),
  ]);

  return (
    <>
      <PageHeader title={t('tabs.consumption')} description={t('consumptionTab.description')} />
      <EnergyConsumption consumption={consumption ?? []} sources={sources ?? []} totals={totals} forecast={forecast} />
    </>
  );
}
