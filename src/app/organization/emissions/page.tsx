import { getTranslations } from 'next-intl/server';
import PageHeader from '@/components/layout/PageHeader';
import { EnergyEmissions } from '@/components/energy/EnergyViews';
import { getOrganizationEnergy, getOrganizationEnergyForecast } from '@/actions/organizations/get-organization-energy';

export const dynamic = 'force-dynamic';

/** The organization's own emissions, summed across every company it operates (#20). */
export default async function OrganizationEmissionsPage() {
  const t = await getTranslations('energyHub');
  const tScope = await getTranslations('dashboard.scope');

  try {
    const energy = await getOrganizationEnergy();
    // The heatmap's rows come back as raw GHG scope keys; this is where they
    // meet the reader's language, same as the scope breakdown elsewhere.
    const heatmap = {
      ...energy.emissionsHeatmap,
      rows: energy.emissionsHeatmap.rows.map((r) => ({
        ...r,
        label: tScope(r.label as 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'),
      })),
    };
    return (
      <>
        <PageHeader title={t('tabs.emissions')} description={t('emissionsTab.description')} />
        <EnergyEmissions
          emissions={energy.emissions}
          totals={energy.emissionTotals}
          forecast={energy.forecast}
          heatmap={heatmap}
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
