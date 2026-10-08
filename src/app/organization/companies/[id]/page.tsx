import { getCompanyOverview } from '@/actions/companies/overview';
import { getCompanyEnergy } from '@/actions/companies/get-company-energy';
import CompanyDetail from './CompanyDetail';

export const dynamic = 'force-dynamic';

/** One company of the organization, read-only: what it holds, seen from the organization's panel (#20). */
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [overview, energy] = await Promise.all([getCompanyOverview(id), getCompanyEnergy(id)]);

  // Not an organization session, or not one of its companies: nothing to show.
  // The panel's layout sends a visitor without a session to the login.
  if (!overview) return null;

  return <CompanyDetail overview={overview} energy={energy} companyId={id} />;
}
