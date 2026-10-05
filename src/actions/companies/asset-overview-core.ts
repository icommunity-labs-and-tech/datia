import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';
import { listAssetCertifications, type AssetCertification } from '@/lib/certification/queries';
import { assetEnergyOverview, type AssetEnergySourceOverview } from '@/lib/energy/asset-overview';

export interface AssetOverview {
  asset: { id: string; name: string; description: string | null; siteName: string | null; createdAt: Date };
  certifications: AssetCertification[];
  sources: AssetEnergySourceOverview[];
}

/**
 * What one asset holds, to read and nothing else — the energy chain behind it
 * (sources → consumption → emissions), not just whether it's certified.
 * Shared by the organization account's own overview and the superadmin's,
 * same as `readCompanyOverview`: neither checks permissions here, the caller
 * has already decided who may see this `scope` and that the asset's id is
 * worth looking up within it.
 */
export async function readAssetOverview(scope: Scope, assetId: string): Promise<AssetOverview | null> {
  const assetRow = await prisma.asset.findFirst({
    where: { id: assetId, ...scopeWhere(scope) },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      EnergySource: { select: { location: true }, take: 1 },
    },
  });
  if (!assetRow) return null;

  const [certifications, sources] = await Promise.all([
    listAssetCertifications(scope, assetId),
    assetEnergyOverview(scope, assetId),
  ]);

  return {
    asset: {
      id: assetRow.id,
      name: assetRow.name,
      description: assetRow.description,
      siteName: assetRow.EnergySource[0]?.location ?? null,
      createdAt: assetRow.createdAt,
    },
    certifications,
    sources,
  };
}
