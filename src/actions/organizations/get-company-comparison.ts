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
  consumptionKwh: number;
  co2eKg: number;
}

/**
 * One row per company, so an organization account can see at a glance which
 * one needs attention — the comparison a company's own Inicio has no reason
 * to show, since a company has no other companies to compare itself with (#20).
 *
 * Two `groupBy` queries regardless of how many companies there are, rather
 * than one `certificationCounts` call per company: the per-company count is
 * exactly what Postgres/SQLite grouping already does in one pass.
 *
 * Consumption and emissions cannot use `groupBy` the same way — neither table
 * carries `companyId` directly, only the asset their energy source belongs to
 * does — so those two are summed in JS from one read each, same as
 * `computeCertificationTrend` does for the organization as a whole.
 */
export async function getCompanyComparison(): Promise<CompanyComparisonRow[]> {
  const { organizationId } = await requireOrganizationAccount();

  const [companies, certTotals, certCertified, lastAssetByCompany, consumptionRows, emissionRows] = await Promise.all([
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
    prisma.energyConsumption.findMany({
      where: { EnergySource: { Asset: { organizationId, companyId: { not: null } } } },
      select: { consumptionKwh: true, EnergySource: { select: { Asset: { select: { companyId: true } } } } },
    }),
    prisma.emissionRecord.findMany({
      where: { EnergyConsumption: { EnergySource: { Asset: { organizationId, companyId: { not: null } } } } },
      select: {
        co2eKg: true,
        EnergyConsumption: { select: { EnergySource: { select: { Asset: { select: { companyId: true } } } } } },
      },
    }),
  ]);

  const totalOf = (companyId: string) => certTotals.find((c) => c.companyId === companyId)?._count.id ?? 0;
  const certifiedOf = (companyId: string) => certCertified.find((c) => c.companyId === companyId)?._count.id ?? 0;
  const lastActivityOf = (companyId: string) =>
    lastAssetByCompany.find((c) => c.companyId === companyId)?._max.createdAt ?? null;

  const consumptionByCompany = new Map<string, number>();
  for (const row of consumptionRows) {
    const companyId = row.EnergySource.Asset?.companyId;
    if (!companyId) continue;
    consumptionByCompany.set(companyId, (consumptionByCompany.get(companyId) ?? 0) + row.consumptionKwh);
  }

  const emissionsByCompany = new Map<string, number>();
  for (const row of emissionRows) {
    const companyId = row.EnergyConsumption.EnergySource.Asset?.companyId;
    if (!companyId) continue;
    emissionsByCompany.set(companyId, (emissionsByCompany.get(companyId) ?? 0) + row.co2eKg);
  }

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
        consumptionKwh: consumptionByCompany.get(c.id) ?? 0,
        co2eKg: emissionsByCompany.get(c.id) ?? 0,
      };
    })
    .sort((a, b) => b.assets - a.assets);
}
