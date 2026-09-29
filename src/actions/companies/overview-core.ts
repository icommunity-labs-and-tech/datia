import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { certifiedAssetIds, listCertifications, type AssetCertification } from '@/lib/certification/queries';
import type { Scope } from '@/lib/scope';

export interface CompanyOverview {
  company: { id: string; name: string; active: boolean; createdAt: Date };
  assets: Array<{ id: string; name: string; siteName: string | null; createdAt: Date; certified: boolean }>;
  certifications: AssetCertification[];
  accounts: Array<{ id: string; name: string | null; email: string; createdAt: Date }>;
}

/**
 * What one company holds, to read and nothing else (#20). Shared by the
 * organization account's own overview and the superadmin's (#19) — neither
 * checks permissions here: the caller has already decided who may see this
 * `scope`, and passes its own already-verified `company` row.
 */
export async function readCompanyOverview(
  scope: Scope,
  company: { id: string; name: string; active: boolean; createdAt: Date }
): Promise<CompanyOverview> {
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
