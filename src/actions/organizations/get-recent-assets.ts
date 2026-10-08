'use server';

import { prisma } from '@/lib/prisma';
import { certifiedAssetIds } from '@/lib/certification/queries';
import { requireOrganizationAccount } from '@/actions/companies/access';
import type { Scope } from '@/lib/scope';

export interface RecentOrganizationAsset {
  id: string;
  name: string;
  companyId: string | null;
  companyName: string | null;
  certified: boolean;
  createdAt: Date;
}

/**
 * The organization's own recent-assets list carries the company name on each
 * row — a company's own Inicio has no reason to, since every row is already
 * its own (#20).
 */
export async function getRecentOrganizationAssets(limit = 5): Promise<RecentOrganizationAsset[]> {
  const { organizationId } = await requireOrganizationAccount();
  const scope: Scope = { organizationId, companyId: null };

  const [rows, certified] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, createdAt: true, companyId: true, Company: { select: { name: true } } },
    }),
    certifiedAssetIds(scope),
  ]);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    companyId: r.companyId,
    companyName: r.Company?.name ?? null,
    certified: certified.has(r.id),
    createdAt: r.createdAt,
  }));
}
