'use server';

import { prisma } from '@/lib/prisma';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { certifiedAssetIds, listCertifications, type AssetCertification } from '@/lib/certification/queries';
import type { Scope } from '@/lib/scope';
import { requireOrganizationAccount } from './access';

export interface CompanyOverview {
  company: { id: string; name: string; active: boolean; createdAt: Date };
  assets: Array<{ id: string; name: string; siteName: string | null; createdAt: Date; certified: boolean }>;
  certifications: AssetCertification[];
  accounts: Array<{ id: string; name: string | null; email: string; createdAt: Date }>;
}

/**
 * What one company of the organization holds, to read and nothing else (#20).
 *
 * The organization account looks at its companies from its own panel, one at a
 * time: the company comes from the address, is checked to be one of the
 * organization's, and only then becomes the scope of every read. It is not a
 * mode of the dashboard, which stays the companies'. Null when the caller is not
 * an organization account or the company is not one of its organization's.
 */
export async function getCompanyOverview(companyId: string): Promise<CompanyOverview | null> {
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationAccount());
  } catch {
    return null;
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
    select: { id: true, name: true, active: true, createdAt: true },
  });
  if (!company) return null;

  const scope: Scope = { organizationId, companyId: company.id };
  const [assets, certified, certifications, accounts] = await Promise.all([
    assetRepository.listForExport(scope, { fullPassport: false }),
    certifiedAssetIds(scope),
    listCertifications(scope),
    userRepository.findByOrganization(scope),
  ]);

  return {
    company,
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      siteName: a.siteName,
      createdAt: a.createdAt,
      certified: certified.has(a.id),
    })),
    certifications,
    accounts: accounts.map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })),
  };
}
