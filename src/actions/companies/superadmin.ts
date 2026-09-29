'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth/tenant';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import type { Scope } from '@/lib/scope';
import { readCompanyOverview, type CompanyOverview } from './overview-core';
import { companiesOfOrganization, type CompanySummary } from './list';

/** The companies of any organization, for the superadmin exploring it (#19). */
export async function listCompaniesForOrganization(organizationId: string): Promise<CompanySummary[]> {
  if (!(await isSuperAdmin())) return [];
  return companiesOfOrganization(organizationId);
}

export interface CompanyEnergyOverview {
  sources: number;
  consumption: { records: number; totalKwh: number };
  emissions: { records: number; verified: number; totalCo2eKg: number };
}

export interface SuperadminCompanyOverview extends CompanyOverview {
  energy: CompanyEnergyOverview;
}

/**
 * What one company holds, seen by the superadmin (#19): the same read-only
 * view the organization account has of its own companies, plus the energy
 * side — sources, consumption, emissions — that only this panel shows.
 *
 * Any company, from any organization: unlike `getCompanyOverview`, there is no
 * "is this one of mine" check, because the superadmin's whole point is to see
 * every organization's.
 */
export async function getSuperadminCompanyOverview(companyId: string): Promise<SuperadminCompanyOverview | null> {
  if (!(await isSuperAdmin())) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, active: true, createdAt: true, organizationId: true },
  });
  if (!company) return null;

  const scope: Scope = { organizationId: company.organizationId, companyId: company.id };
  const { id, name, active, createdAt } = company;
  const [base, sources, consumption, emissions] = await Promise.all([
    readCompanyOverview(scope, { id, name, active, createdAt }),
    // A count, not a listing: the volumes are small enough that one generous
    // page beats adding a dedicated count method for a single caller.
    energyRepository.findSourcesByOrganization(scope, 1000),
    energyRepository.getConsumptionTotals(scope),
    energyRepository.getEmissionTotals(scope),
  ]);

  return {
    ...base,
    energy: {
      sources: sources.data.length,
      consumption: { records: consumption.records, totalKwh: consumption.totalKwh },
      emissions: { records: emissions.records, verified: emissions.verified, totalCo2eKg: emissions.totalCo2eKg },
    },
  };
}

/** Activates or deactivates a company. The superadmin's one piece of management here (#19). */
export async function setCompanyActive(companyId: string, active: boolean): Promise<{ success: boolean }> {
  if (!(await isSuperAdmin())) return { success: false };

  const company = await prisma.company.update({
    where: { id: companyId },
    data: { active },
    select: { id: true, organizationId: true },
  }).catch(() => null);
  if (!company) return { success: false };

  revalidatePath(`/superadmin/organizations/${company.organizationId}`);
  revalidatePath(`/superadmin/organizations/${company.organizationId}/companies/${company.id}`);
  return { success: true };
}
