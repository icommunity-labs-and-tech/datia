import { getCurrentTenant, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { isOrganizationRole } from '@/lib/auth/roles';

/**
 * Companies are managed by the account that operates the organization (#20). A
 * company account cannot create its own siblings, and the superadmin works on
 * organizations, not on what is inside them.
 */
export async function requireOrganizationAccount(): Promise<{ organizationId: string; userId: string }> {
  const tenant = await getCurrentTenant();
  if (!tenant.organizationId || !isOrganizationRole(tenant.userRole)) {
    throw new TenantContextNotFoundError('Solo la cuenta de la organización gestiona las empresas');
  }
  return { organizationId: tenant.organizationId, userId: tenant.userId };
}
