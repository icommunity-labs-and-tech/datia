'use server';

import { prisma } from '@/lib/prisma';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { certificationCounts } from '@/lib/certification/queries';
import { companiesOfOrganization, type CompanySummary } from '@/actions/companies/list';
import { requireOrganizationAccount } from '@/actions/companies/access';
import type { Scope } from '@/lib/scope';

export interface OrganizationOverview {
  companies: CompanySummary[];
  companiesCount: number;
  activeCompaniesCount: number;
  totalAssets: number;
  totalCertifications: number;
  certifiedCertifications: number;
  activeAccountsCount: number;
  pendingAccountsCount: number;
}

/**
 * What the organization account sees on its own home: the same counts a
 * company sees, summed across every company it operates. `scopeWhere` already
 * covers the whole organization for a scope with no company (#20), so this
 * reuses the exact repository calls a company's own dashboard makes — just
 * with that scope instead of one company's.
 */
export async function getOrganizationOverview(): Promise<OrganizationOverview> {
  const { organizationId } = await requireOrganizationAccount();
  const scope: Scope = { organizationId, companyId: null };

  const [companies, totalAssets, certifications, accountsByStatus] = await Promise.all([
    companiesOfOrganization(organizationId),
    assetRepository.countTotalItems(scope),
    certificationCounts(scope),
    // companyId: not null excludes the organization's own account, which
    // belongs to no company and so is not what "accounts" means here.
    prisma.user.groupBy({
      by: ['status'],
      where: { organizationId, companyId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const countOf = (status: string) => accountsByStatus.find((c) => c.status === status)?._count.id ?? 0;

  return {
    companies,
    companiesCount: companies.length,
    activeCompaniesCount: companies.filter((c) => c.active).length,
    totalAssets,
    totalCertifications: certifications.total,
    certifiedCertifications: certifications.certified,
    activeAccountsCount: countOf('ACTIVE'),
    pendingAccountsCount: countOf('PENDING'),
  };
}
