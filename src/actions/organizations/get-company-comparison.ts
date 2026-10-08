'use server';

import { prisma } from '@/lib/prisma';
import { companiesOfOrganization } from '@/actions/companies/list';
import { requireOrganizationAccount } from '@/actions/companies/access';

export interface CompanyComparisonRow {
  id: string;
  name: string;
  active: boolean;
  assets: number;
  certifications: number;
  certifiedCertifications: number;
  /** 0–100, null when the company has no certifications to score yet. */
  coverage: number | null;
  lastActivityAt: Date | null;
}

/**
 * One row per company, so an organization account can see at a glance which
 * one needs attention — the comparison a company's own Inicio has no reason
 * to show, since a company has no other companies to compare itself with (#20).
 *
 * Two `groupBy` queries regardless of how many companies there are, rather
 * than one `certificationCounts` call per company: the per-company count is
 * exactly what Postgres/SQLite grouping already does in one pass.
 */
export async function getCompanyComparison(): Promise<CompanyComparisonRow[]> {
  const { organizationId } = await requireOrganizationAccount();

  const [companies, certTotals, certCertified, lastAssetByCompany] = await Promise.all([
    companiesOfOrganization(organizationId),
    prisma.certification.groupBy({
      by: ['companyId'],
      where: { organizationId, companyId: { not: null } },
      _count: { id: true },
    }),
    prisma.certification.groupBy({
      by: ['companyId'],
      where: { organizationId, companyId: { not: null }, status: 'CERTIFIED' },
      _count: { id: true },
    }),
    prisma.asset.groupBy({
      by: ['companyId'],
      where: { organizationId, companyId: { not: null } },
      _max: { createdAt: true },
    }),
  ]);

  const totalOf = (companyId: string) => certTotals.find((c) => c.companyId === companyId)?._count.id ?? 0;
  const certifiedOf = (companyId: string) => certCertified.find((c) => c.companyId === companyId)?._count.id ?? 0;
  const lastActivityOf = (companyId: string) =>
    lastAssetByCompany.find((c) => c.companyId === companyId)?._max.createdAt ?? null;

  return companies
    .map((c) => {
      const certifications = totalOf(c.id);
      const certifiedCertifications = certifiedOf(c.id);
      return {
        id: c.id,
        name: c.name,
        active: c.active,
        assets: c.assets,
        certifications,
        certifiedCertifications,
        coverage: certifications ? Math.round((certifiedCertifications / certifications) * 100) : null,
        lastActivityAt: lastActivityOf(c.id),
      };
    })
    .sort((a, b) => b.assets - a.assets);
}
