/**
 * Who can do what (#20).
 *
 * Three levels: SUPER_ADMIN operates the platform and creates organizations;
 * ORG_ADMIN operates one organization and sees the set of its companies; ADMIN
 * is a company's own account and sees only that company. The last two open the
 * dashboard, and this module has no imports so the middleware can use it too.
 */
export const DASHBOARD_ROLES = ['ADMIN', 'ORG_ADMIN'] as const;

/** Roles that can open the dashboard: a company account, or the organization's. */
export function isDashboardRole(role: unknown): boolean {
  return typeof role === 'string' && (DASHBOARD_ROLES as readonly string[]).includes(role);
}

/** The account that operates the whole organization rather than one company. */
export function isOrganizationRole(role: unknown): boolean {
  return role === 'ORG_ADMIN';
}
