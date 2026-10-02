import { getOrganizationAssetOverview } from '@/actions/companies/asset-overview';
import AssetOverview from './AssetOverview';

export const dynamic = 'force-dynamic';

/** One asset of one company, read-only: the energy chain behind it, seen from the organization's panel. */
export default async function OrganizationAssetPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const { id, assetId } = await params;
  const overview = await getOrganizationAssetOverview(id, assetId);

  // Not an organization session, or not one of its assets: nothing to show.
  if (!overview) return null;

  return <AssetOverview overview={overview} />;
}
