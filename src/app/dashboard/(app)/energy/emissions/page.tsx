import { EnergyEmissions } from '@/components/energy/EnergyViews';
import { listEmissions } from '@/actions/energy/list-emissions';
import { getEmissionTotals } from '@/actions/energy/get-emission-totals';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyEmissionsPage() {
  const t = await getTranslations('energyHub');
  // Emissions stand alone: no sources or consumption are loaded for this view.
  // The listing is paginated; the totals cover every record.
  const [emissions, totals] = await Promise.all([listEmissions(), getEmissionTotals()]);

  return (
    <>
      <PageHeader title={t('tabs.emissions')} description={t('emissionsTab.description')} />
      <EnergyEmissions emissions={emissions ?? []} totals={totals} />
    </>
  );
}
