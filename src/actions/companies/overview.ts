'use server';

import { prisma } from '@/lib/prisma';
import type { Scope } from '@/lib/scope';
import { requireOrganizationAccount } from './access';
import { readCompanyOverview, type CompanyOverview } from './overview-core';

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
  return readCompanyOverview(scope, company);
}
