'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { listAssetCertifications, type AssetCertification } from '@/lib/certification/queries';

/** The proofs anchored for one asset, newest first. */
export async function getAssetCertifications(assetId: string): Promise<AssetCertification[]> {
  const organizationId = await requireOrganizationId();
  return listAssetCertifications(organizationId, assetId);
}
