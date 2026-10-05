'use server';

import { prisma } from '@/lib/prisma';
import type { Scope } from '@/lib/scope';
import { requireOrganizationAccount } from './access';
import { readAssetOverview, type AssetOverview } from './asset-overview-core';

export interface OrganizationAssetOverview extends AssetOverview {
  company: { id: string; name: string };
}

/**
 * One asset of one company, read-only, from the organization's own panel.
 * Same scoping pattern as `getCompanyOverview`: the company comes from the
 * address, is checked to be one of the organization's, and only then becomes
 * the scope of every read.
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
  const overview = await readAssetOverview(scope, assetId);
  if (!overview) return null;

  return { ...overview, company };
}
