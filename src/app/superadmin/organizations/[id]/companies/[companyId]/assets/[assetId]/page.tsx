import { getSuperadminAssetOverview } from '@/actions/companies/asset-overview-superadmin';
import AssetOverviewPanel from '@/components/views/AssetOverviewPanel';

export const dynamic = 'force-dynamic';

/** One asset of any company, read-only: the energy chain behind it, as the superadmin explores it (#19). */
export default async function SuperadminAssetPage({
  params,
}: {
  params: Promise<{ id: string; companyId: string; assetId: string }>;
}) {
  const { id, companyId, assetId } = await params;
  const overview = await getSuperadminAssetOverview(companyId, assetId);

  // Not a superadmin session, or not one of its assets: nothing to show.
  if (!overview) return null;

  return (
    <AssetOverviewPanel
      overview={overview}
      backHref={`/superadmin/organizations/${id}/companies/${companyId}`}
      backLabel={overview.company.name}
    />
  );
}
