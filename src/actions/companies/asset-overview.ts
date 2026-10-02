'use server';

import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';
import { requireOrganizationAccount } from './access';
import { listAssetCertifications, type AssetCertification } from '@/lib/certification/queries';
import { assetEnergyOverview, type AssetEnergySourceOverview } from '@/lib/energy/asset-overview';

export interface OrganizationAssetOverview {
  asset: { id: string; name: string; description: string | null; siteName: string | null; createdAt: Date };
  company: { id: string; name: string };
  certifications: AssetCertification[];
  sources: AssetEnergySourceOverview[];
}

/**
 * One asset of one company, read-only, from the organization's own panel — the
 * energy chain behind it (sources → consumption → emissions), not just
 * whether it's certified. Same scoping pattern as `getCompanyOverview`: the
 * company comes from the address, is checked to be one of the organization's,
 * and only then becomes the scope of every read.
 */
export async function getOrganizationAssetOverview(
  companyId: string,
  assetId: string
): Promise<OrganizationAssetOverview | null> {
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationAccount());
  } catch {
    return null;
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
    select: { id: true, name: true },
  });
  if (!company) return null;

  const scope: Scope = { organizationId, companyId: company.id };

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
    company,
    certifications,
    sources,
  };
}
