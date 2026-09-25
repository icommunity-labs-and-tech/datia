import { cookies } from 'next/headers';
import { organizationAuthConfig } from '@/lib/auth/organization/config';
import { verifyOrganizationJWT } from '@/lib/auth/organization/jwt';
import { TenantContextNotFoundError, type TenantContext } from '@/lib/auth/tenant';

/**
 * The session of the account that operates the organization, and nothing else
 * (#20). It reads that session's own cookie rather than asking "who is the
 * current tenant", so a browser that also holds a dashboard session still acts
 * here as the organization. A company account cannot create its own siblings,
 * and the platform account works on organizations, not on what is inside one.
 */
export async function requireOrganizationAccount(): Promise<
  Pick<TenantContext, 'userId' | 'userRole' | 'companyId'> & { organizationId: string }
> {
  const token = (await cookies()).get(organizationAuthConfig.cookieName)?.value;
  const payload = token ? await verifyOrganizationJWT(token) : null;
  if (!payload?.organizationId) {
    throw new TenantContextNotFoundError('Solo la cuenta de la organización gestiona las empresas');
  }
  return { organizationId: payload.organizationId, companyId: null, userRole: payload.role, userId: payload.id };
}
