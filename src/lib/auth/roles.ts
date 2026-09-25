/**
 * Who can do what (#20).
 *
 * Three levels: SUPER_ADMIN operates the platform and creates organizations;
 * ORG_ADMIN operates one organization from the superadmin panel, where it manages
 * its companies; ADMIN is a company's own account and is the only one that opens
 * the dashboard, which is the company's and shows nobody else's data.
 *
 * This module has no imports so the middleware can use it too.
 */
export const DASHBOARD_ROLES = ['ADMIN'] as const;

/** Roles that can open the dashboard: a company's own account. */
export function isDashboardRole(role: unknown): boolean {
  return typeof role === 'string' && (DASHBOARD_ROLES as readonly string[]).includes(role);
}

/** The account that operates the whole organization rather than one company. */
export function isOrganizationRole(role: unknown): boolean {
  return role === 'ORG_ADMIN';
}
