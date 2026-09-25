/**
 * The company the organization's own account is looking at (#20).
 *
 * That account has no company of its own and sees all of them, but can narrow
 * the dashboard to one: the choice lives in this cookie, and `getCurrentTenant`
 * turns it into the scope's company after checking the company is one of the
 * organization's. A company account ignores it.
 */
export const COMPANY_SCOPE_COOKIE = 'datia-company-scope';
