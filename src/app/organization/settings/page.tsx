import { requireOrganizationAccount } from '@/actions/companies/access';
import OrganizationSettings from './OrganizationSettings';

export const dynamic = 'force-dynamic';

/** The organization account's own settings: today, just its password (#20). */
export default async function OrganizationSettingsPage() {
  try {
    await requireOrganizationAccount();
  } catch {
    // Not an organization session: nothing to show. The panel's layout, which
    // knows who is signed in, sends the visitor to the login or to its own half.
    return null;
  }

  return <OrganizationSettings />;
}
