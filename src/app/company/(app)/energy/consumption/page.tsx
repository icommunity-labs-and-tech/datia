import { CompanyConsumption } from '@/components/energy/CompanyEnergyViews';
import { getConsumptionTotals } from '@/actions/energy/get-consumption-totals';
import { getConsumptionBreakdown } from '@/actions/energy/get-breakdown';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import PageHeader from '@/components/layout/PageHeader';
import ImportReadingsButton from '@/components/energy/ImportReadingsButton';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EnergyConsumptionPage() {
  const t = await getTranslations('energyHub');
  const [totals, breakdown, forecast] = await Promise.all([
    getConsumptionTotals(),
    getConsumptionBreakdown(),
    getEnergyForecast(6),
  ]);

  return (
    <>
      <PageHeader
        title={t('tabs.consumption')}
        description={t('company.consumptionDescription')}
        actions={<ImportReadingsButton />}
      />
      <CompanyConsumption totals={totals} breakdown={breakdown} forecast={forecast} />
    </>
  );
}
