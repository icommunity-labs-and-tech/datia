import { requireOrganizationAccount } from '@/actions/companies/access';
import { listCompanies } from '@/actions/companies/list';
import CompaniesPanel from './CompaniesPanel';

export const dynamic = 'force-dynamic';

/** The companies of the organization: only its own account manages them (#20). */
export default async function CompaniesPage() {
  try {
    await requireOrganizationAccount();
  } catch {
    // Not an organization session: nothing to show. The panel's layout, which
    // knows who is signed in, sends the visitor to the login or to its own half.
    return null;
  }

  return <CompaniesPanel initial={await listCompanies()} />;
}
