import OrganizationOverview from './OrganizationOverview';
import { getOrganizationOverview } from '@/actions/organizations/get-overview';
import {
  getOrganizationTrend,
  getOrganizationEnergySummary,
  isOrganizationEnergyEnabled,
} from '@/actions/organizations/get-trend';
import { getCompanyComparison } from '@/actions/organizations/get-company-comparison';
import { getRecentOrganizationAssets } from '@/actions/organizations/get-recent-assets';

export const dynamic = 'force-dynamic';

/** The organization account's home: what it has across every company it operates (#20). */
export default async function OrganizationHomePage() {
  try {
    const [overview, trend, energySummary, energyEnabled, comparison, recentAssets] = await Promise.all([
      getOrganizationOverview(),
      getOrganizationTrend().catch(() => undefined),
      getOrganizationEnergySummary(),
      isOrganizationEnergyEnabled(),
      getCompanyComparison(),
      getRecentOrganizationAssets(),
    ]);

    return (
      <OrganizationOverview
        overview={overview}
        trend={trend}
        energySummary={energySummary}
        energyEnabled={energyEnabled}
        comparison={comparison}
        recentAssets={recentAssets}
      />
    );
  } catch {
    // Not an organization session: nothing to show. The panel's layout, which
    // knows who is signed in, sends the visitor to the login or to its own half.
    return null;
  }
}
