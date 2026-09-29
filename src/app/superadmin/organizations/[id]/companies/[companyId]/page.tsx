import { getSuperadminCompanyOverview } from '@/actions/companies/superadmin';
import SuperadminCompanyDetail from './SuperadminCompanyDetail';

export const dynamic = 'force-dynamic';

/** One company of any organization, as the superadmin explores it (#19). */
export default async function SuperadminCompanyPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string }>;
}) {
  const { id, companyId } = await params;
  const overview = await getSuperadminCompanyOverview(companyId);

  // Not a superadmin session, or the company does not exist: nothing to show.
  if (!overview) return null;

  return <SuperadminCompanyDetail organizationId={id} overview={overview} />;
}
