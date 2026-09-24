/**
 * What a caller is allowed to see (#20).
 *
 * The organisation is always there. The company is set for an account that
 * belongs to one — it sees only that company's data — and null for the one
 * that operates the organisation, which sees the set of its companies.
 */
export interface Scope {
  organizationId: string;
  companyId: string | null;
}

/**
 * The `where` fragment that restricts a query on a table with `organizationId`
 * and `companyId` to what the scope covers. The organisation is filtered even
 * when there is a company, so a company id from another organisation matches
 * nothing.
 */
export function scopeWhere(scope: Scope): { organizationId: string; companyId?: string } {
  return scope.companyId
    ? { organizationId: scope.organizationId, companyId: scope.companyId }
    : { organizationId: scope.organizationId };
}

/**
 * What an API token is allowed to see: its organisation and, if it has one, its
 * company. A token issued at organisation level has none and sees the set.
 */
export function authScope(auth: { organizationId: string; companyId: string | null }): Scope {
  return { organizationId: auth.organizationId, companyId: auth.companyId };
}
