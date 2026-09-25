'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COMPANY_SCOPE_COOKIE } from '@/lib/auth/company-scope';
import { getCurrentTenant } from '@/lib/auth/tenant';
import { isOrganizationRole } from '@/lib/auth/roles';
import { requireOrganizationAccount } from './access';

export interface CompanySwitcherState {
  companies: Array<{ id: string; name: string }>;
  /** The company the dashboard is narrowed to, or null for all of them. */
  current: string | null;
}

/**
 * What the company selector shows. Null for any account but the organization's
 * own, so the selector can ask without knowing who is signed in.
 */
export async function getCompanySwitcher(): Promise<CompanySwitcherState | null> {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant.organizationId || !isOrganizationRole(tenant.userRole)) return null;

    const companies = await prisma.company.findMany({
      where: { organizationId: tenant.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return { companies, current: tenant.companyId };
  } catch {
    return null;
  }
}

/** Narrows the dashboard to one company, or back to all of them with null. */
export async function setCompanyScope(companyId: string | null): Promise<{ success: boolean }> {
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationAccount());
  } catch {
    return { success: false };
  }

  const store = await cookies();
  if (!companyId) {
    store.delete(COMPANY_SCOPE_COOKIE);
    return { success: true };
  }

  // Only one of this organization's companies can be chosen.
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
    select: { id: true },
  });
  if (!company) return { success: false };

  store.set(COMPANY_SCOPE_COOKIE, company.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return { success: true };
}
