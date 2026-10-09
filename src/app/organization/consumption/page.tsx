import { getTranslations } from 'next-intl/server';
import PageHeader from '@/components/layout/PageHeader';
import { EnergyConsumption } from '@/components/energy/EnergyViews';
import { getOrganizationEnergy, getOrganizationEnergyForecast } from '@/actions/organizations/get-organization-energy';

export const dynamic = 'force-dynamic';

/** The organization's own consumption, summed across every company it operates (#20). */
export default async function OrganizationConsumptionPage() {
  const t = await getTranslations('energyHub');

  try {
    const energy = await getOrganizationEnergy();
    return (
      <>
        <PageHeader title={t('tabs.consumption')} description={t('consumptionTab.description')} />
        <EnergyConsumption
          consumption={energy.consumption}
          sources={energy.sources}
          totals={energy.consumptionTotals}
          forecast={energy.forecast}
          heatmap={energy.consumptionHeatmap}
          fetchForecast={getOrganizationEnergyForecast}
        />
      </>
    );
  } catch {
    // Not an organization session: nothing to show. The panel's layout, which
    // knows who is signed in, sends the visitor to the login or to its own half.
    return null;
  }
}
