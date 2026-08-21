import { EnergyEmissions } from '@/components/energy/EnergyViews';
import { listEmissions } from '@/actions/energy/list-emissions';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyEmissionsPage() {
  const t = await getTranslations('energyHub');
  // Emissions stand alone: no sources or consumption are loaded for this view.
  const emissions = await listEmissions();

  return (
    <>
      <PageHeader title={t('tabs.emissions')} description={t('emissionsTab.description')} />
      <EnergyEmissions emissions={emissions ?? []} />
    </>
  );
}
