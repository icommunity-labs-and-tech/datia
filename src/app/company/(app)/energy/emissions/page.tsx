import { EnergyEmissions } from '@/components/energy/EnergyViews';
import { listEmissions } from '@/actions/energy/list-emissions';
import { getEmissionTotals } from '@/actions/energy/get-emission-totals';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyEmissionsPage() {
  const t = await getTranslations('energyHub');
  // Emissions stand alone: no sources or consumption are loaded for this view.
  // The listing is paginated; the totals cover every record.
  const [emissions, totals, forecast] = await Promise.all([listEmissions(), getEmissionTotals(), getEnergyForecast(6)]);

  return (
    <>
      <PageHeader title={t('tabs.emissions')} description={t('emissionsTab.description')} />
      <EnergyEmissions emissions={emissions ?? []} totals={totals} forecast={forecast} />
    </>
  );
}
