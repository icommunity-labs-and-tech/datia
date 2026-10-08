import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { verifyOrganizationJWT } from '@/lib/auth/organization/jwt';
import { organizationAuthConfig } from '@/lib/auth/organization/config';
import { isDashboardRole, isOrganizationRole } from '@/lib/auth/roles';

export async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

  if (!token) {
    throw new Error('No autorizado');
  }

  const payload = await verifyAdminJWT(token);
  if (!payload || !isDashboardRole(payload.role)) {
    throw new Error('Solo los administradores pueden realizar esta acción');
  }

  return payload;
}

/**
 * Whoever is allowed to change their own password: a company account, a
 * superadmin, or the account that operates an organization. Checked as two
 * separate sessions, not one combined tenant: this only ever acts on the
 * caller's own id, so there is no scope to confuse between them.
 */
export async function verifyUserAuth() {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const payload = await verifyAdminJWT(adminToken);
    if (payload && (isDashboardRole(payload.role) || payload.role === 'SUPER_ADMIN')) {
      return payload;
    }
  }

  const organizationToken = cookieStore.get(organizationAuthConfig.cookieName)?.value;
  if (organizationToken) {
    const payload = await verifyOrganizationJWT(organizationToken);
    if (payload && isOrganizationRole(payload.role)) {
      return payload;
    }
  }

  throw new Error('No autorizado');
}
