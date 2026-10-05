'use server';

import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth/tenant';
import type { Scope } from '@/lib/scope';
import { readAssetOverview, type AssetOverview } from './asset-overview-core';

export interface SuperadminAssetOverview extends AssetOverview {
  organizationId: string;
  company: { id: string; name: string };
}

/**
 * One asset of any company, seen by the superadmin (#19): the same read-only
 * view the organization account has of its own. Any company, from any
 * organization — unlike `getOrganizationAssetOverview`, there is no "is this
 * one of mine" check, because the superadmin's whole point is to see every
 * organization's.
 */
export async function getSuperadminAssetOverview(
  companyId: string,
  assetId: string
): Promise<SuperadminAssetOverview | null> {
  if (!(await isSuperAdmin())) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, organizationId: true },
  });
  if (!company) return null;

  const scope: Scope = { organizationId: company.organizationId, companyId: company.id };
  const overview = await readAssetOverview(scope, assetId);
  if (!overview) return null;

  return { ...overview, organizationId: company.organizationId, company: { id: company.id, name: company.name } };
}
