'use server';

import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth/tenant';
import { computeCertificationTrend, type CertificationTrend } from '@/lib/dashboard/certificationTrend';

export interface PlatformStats {
  organizationsCount: number;
  companiesCount: number;
  activeCompaniesCount: number;
  totalAssets: number;
  totalCertifications: number;
  certifiedCertifications: number;
  /** Issued to iBS but not yet confirmed on chain — same figure the Certificaciones nav tracks. */
  pendingCertifications: number;
}

export interface TopOrganization {
  id: string;
  name: string;
  assets: number;
  certifications: number;
}

export interface PlatformHome {
  stats: PlatformStats;
  trend: CertificationTrend;
  topOrganizations: TopOrganization[];
}

/**
 * The superadmin's own home: what the whole platform holds, across every
 * organization — the same kind of series an organization's home shows summed
 * across its companies (#20), one level up. `null` scope reads everything.
 */
export async function getPlatformHome(): Promise<PlatformHome | null> {
  if (!(await isSuperAdmin())) return null;

  const [organizationsCount, companies, totalAssets, certTotal, certCertified, certIssued, trend, topOrgs] =
    await Promise.all([
      prisma.organization.count(),
      prisma.company.findMany({ select: { active: true } }),
      prisma.asset.count(),
      prisma.certification.count(),
      prisma.certification.count({ where: { status: 'CERTIFIED' } }),
      prisma.certification.count({ where: { status: 'ISSUED' } }),
      computeCertificationTrend(null),
      prisma.organization.findMany({
        select: { id: true, name: true, _count: { select: { Asset: true, Certification: true } } },
        orderBy: { Asset: { _count: 'desc' } },
        take: 5,
      }),
    ]);

  return {
    stats: {
      organizationsCount,
      companiesCount: companies.length,
      activeCompaniesCount: companies.filter((c) => c.active).length,
      totalAssets,
      totalCertifications: certTotal,
      certifiedCertifications: certCertified,
      pendingCertifications: certIssued,
    },
    trend,
    topOrganizations: topOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      assets: o._count.Asset,
      certifications: o._count.Certification,
    })),
  };
}
