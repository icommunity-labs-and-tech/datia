'use server';

import { prisma } from '@/lib/prisma';
import { computeCertificationTrend, type CertificationTrend } from '@/lib/dashboard/certificationTrend';
import { computeEnergySummary, type EnergySummary } from '@/lib/dashboard/energySummary';
import { requireOrganizationAccount } from '@/actions/companies/access';
import type { Scope } from '@/lib/scope';

/**
 * The same chart and GHG-scope split a company's own Inicio shows, summed
 * across every company the organization operates — the same `computeCertificationTrend`
 * a company dashboard calls, just with a scope that has no `companyId` (#20).
 */
export async function getOrganizationTrend(): Promise<CertificationTrend> {
  const { organizationId } = await requireOrganizationAccount();
  const scope: Scope = { organizationId, companyId: null };
  return computeCertificationTrend(scope);
}

export async function getOrganizationEnergySummary(): Promise<EnergySummary> {
  const { organizationId } = await requireOrganizationAccount();
  const scope: Scope = { organizationId, companyId: null };
  return computeEnergySummary(scope);
}

/** The energy module is an organization-wide switch (#20), not a per-company one. */
export async function isOrganizationEnergyEnabled(): Promise<boolean> {
  const { organizationId } = await requireOrganizationAccount();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const cfg = org?.settings as { modules?: { energy?: boolean } } | null;
  return cfg?.modules?.energy === true;
}
