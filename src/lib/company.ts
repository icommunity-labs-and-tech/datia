import { prisma } from '@/lib/prisma';
import type { Scope } from '@/lib/scope';

/**
 * The company an organization's data belongs to.
 *
 * Phase 1 of #20: every organization has one default company, created by the
 * migration for what already existed, and everything that is written is filed
 * under it. Scope is still the organization until the session carries a
 * company, so until then this is where a new row learns which one it is.
 *
 * Created on demand for an organization that has none yet — one made after the
 * migration, or the e2e one — so a write never fails for lack of it.
 */
export async function defaultCompanyId(organizationId: string): Promise<string> {
  const existing = await prisma.company.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!organization) throw new Error(`Organización no encontrada: ${organizationId}`);

  try {
    const created = await prisma.company.create({
      data: { organizationId, name: organization.name },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    // Two requests created it at once: the other one won, use its company.
    const raced = await prisma.company.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (raced) return raced.id;
    throw error;
  }
}

/**
 * The company a new row is filed under: the scope's own, or — for the account
 * that operates the whole organisation, which has none — the default one until
 * it can choose (#20, phase 3).
 */
export async function companyFor(scope: Scope): Promise<string> {
  return scope.companyId ?? defaultCompanyId(scope.organizationId);
}
