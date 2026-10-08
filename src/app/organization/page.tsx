import OrganizationOverview from './OrganizationOverview';
import { getOrganizationOverview } from '@/actions/organizations/get-overview';

export const dynamic = 'force-dynamic';

/** The organization account's home: what it has across every company it operates (#20). */
export default async function OrganizationHomePage() {
  try {
    const overview = await getOrganizationOverview();
    return <OrganizationOverview overview={overview} />;
  } catch {
    // Not an organization session: nothing to show. The panel's layout, which
    // knows who is signed in, sends the visitor to the login or to its own half.
    return null;
  }
}
