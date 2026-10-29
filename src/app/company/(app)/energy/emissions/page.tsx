import { CompanyEmissions } from '@/components/energy/CompanyEnergyViews';
import { getEmissionTotals } from '@/actions/energy/get-emission-totals';
import { getEmissionBreakdown } from '@/actions/energy/get-breakdown';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import { listEmissionRecords } from '@/actions/energy/records';
import PageHeader from '@/components/layout/PageHeader';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyEmissionsPage() {
  const t = await getTranslations('energyHub');
  const [totals, breakdown, forecast, records] = await Promise.all([
    getEmissionTotals(),
    getEmissionBreakdown(),
    getEnergyForecast(6),
    listEmissionRecords({ page: 1 }),
  ]);

  return (
    <>
      <PageHeader title={t('tabs.emissions')} description={t('company.emissionsDescription')} />
      <CompanyEmissions totals={totals} breakdown={breakdown} forecast={forecast} records={records} />
    </>
  );
}
