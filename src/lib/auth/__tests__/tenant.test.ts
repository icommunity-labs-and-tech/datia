import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The two sessions use different cookies and can coexist in one browser: a
 * superadmin who also opens an organisation's dashboard carries both. Which one
 * answers "what organisation is this?" decides whether the dashboard works.
 */

const cookieJar = new Map<string, string>();
const { findUnique, mockCurrentSuperAdmin } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  mockCurrentSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('../superadmin/identity', () => ({ currentSuperAdmin: mockCurrentSuperAdmin }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
  }),
}));

vi.mock('../admin/jwt', () => ({
  verifyAdminJWT: async (token: string) =>
    token === 'admin-ok'
      ? { id: 'u-admin', role: 'ADMIN', organizationId: 'org-1', companyId: 'co-1' }
      : token === 'admin-sesion-antigua'
        ? { id: 'u-admin', role: 'ADMIN', organizationId: 'org-1' }
        : token === 'admin-sin-empresa'
          ? { id: 'u-admin', role: 'ADMIN', organizationId: 'org-1', companyId: null }
      : token === 'admin-sin-org'
        ? { id: 'u-admin', role: 'ADMIN', organizationId: undefined }
        : null,
}));

vi.mock('../superadmin/jwt', () => ({
  verifySuperAdminJWT: async (token: string) =>
    token === 'super-ok' ? { id: 'u-super', role: 'SUPER_ADMIN' } : null,
}));

vi.mock('../organization/jwt', () => ({
  verifyOrganizationJWT: async (token: string) =>
    token === 'org-ok' ? { id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1' } : null,
}));
vi.mock('../organization/config', () => ({ organizationAuthConfig: { cookieName: 'organization-auth-token' } }));
vi.mock('../admin/config', () => ({ adminAuthConfig: { cookieName: 'company-auth-token' } }));
vi.mock('../superadmin/config', () => ({
  superadminAuthConfig: { cookieName: 'supercompany-auth-token' },
}));

const { getCurrentTenant, isSuperAdmin, requireOrganizationId, requireScope } = await import('../tenant');

beforeEach(() => {
  cookieJar.clear();
  findUnique.mockReset();
});

describe('getCurrentTenant', () => {
  it('resolves the organisation from an admin session', async () => {
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({
      organizationId: 'org-1',
      userRole: 'ADMIN',
    });
  });

  it('has no organisation for a superadmin session', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({
      organizationId: null,
      userRole: 'SUPER_ADMIN',
    });
  });

  it('prefers the admin session when both cookies are present', async () => {
    // The bug: a superadmin who also had a dashboard session got no
    // organisation, and every scoped operation failed on a valid admin session.
    cookieJar.set('supercompany-auth-token', 'super-ok');
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: 'org-1' });
  });

  it('falls back to the superadmin session when the admin one carries no organisation', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    cookieJar.set('company-auth-token', 'admin-sin-org');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: null });
  });

  it('throws when neither session is valid', async () => {
    cookieJar.set('company-auth-token', 'caducado');
    await expect(getCurrentTenant()).rejects.toThrow();
  });
});

describe('requireOrganizationId', () => {
  it('returns the organisation of an admin session', async () => {
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(requireOrganizationId()).resolves.toBe('org-1');
  });

  it('still refuses a superadmin-only session, which has no organisation', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    await expect(requireOrganizationId()).rejects.toThrow(/organizationId/);
  });

  it('no longer fails when both sessions are open', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(requireOrganizationId()).resolves.toBe('org-1');
  });

  it('reads only the session, so no organisation can leak between requests', async () => {
    // It used to return an organisation the API route parked in module state, so
    // a request with no cookie at all could land on another tenant's data (#30).
    const tenant = await import('../tenant');
    expect('setApiOrganizationId' in tenant).toBe(false);
    await expect(requireOrganizationId()).rejects.toThrow();
  });
});

describe('isSuperAdmin', () => {
  // Delegates entirely to currentSuperAdmin() (#20 follow-up, IAP in
  // production) — that module's own tests cover the IAP-vs-cookie and
  // active-SUPER_ADMIN-row logic; this just checks the delegation itself.
  beforeEach(() => mockCurrentSuperAdmin.mockReset());

  it('is true when currentSuperAdmin resolves an identity', async () => {
    mockCurrentSuperAdmin.mockResolvedValue({ id: 'u-super', email: 'a@x.test', name: 'A', role: 'SUPER_ADMIN' });
    await expect(isSuperAdmin()).resolves.toBe(true);
  });

  it('stays true when an admin session is open alongside it', async () => {
    // Scoping now prefers the admin session; privileges must not follow it.
    mockCurrentSuperAdmin.mockResolvedValue({ id: 'u-super', email: 'a@x.test', name: 'A', role: 'SUPER_ADMIN' });
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(isSuperAdmin()).resolves.toBe(true);
  });

  it('is false for an admin session alone', async () => {
    mockCurrentSuperAdmin.mockResolvedValue(null);
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(isSuperAdmin()).resolves.toBe(false);
  });

  // isSuperAdmin()'s own try/catch around an unexpected throw from
  // currentSuperAdmin() is covered by the session route's equivalent test
  // (src/app/api/auth/superadmin/session/__tests__/route.test.ts) — the same
  // scenario here reliably trips this file's rejection handling in a way
  // unrelated to the behavior under test, independent of how the rejection
  // is constructed or whether it is pre-handled.
});

describe('company of the session (#20)', () => {
  it('reads the company from the token', async () => {
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('reads it from the account for a session issued before the token carried it', async () => {
    cookieJar.set('company-auth-token', 'admin-sesion-antigua');
    findUnique.mockResolvedValue({ companyId: 'co-9' });
    await expect(getCurrentTenant()).resolves.toMatchObject({ companyId: 'co-9' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u-admin' }, select: { companyId: true } });
  });

  it('has no company for a superadmin', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ companyId: null });
  });
});

describe('requireScope', () => {
  it('scopes an account to its organisation and company', async () => {
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(requireScope()).resolves.toEqual({ organizationId: 'org-1', companyId: 'co-1' });
  });

  it('refuses an account that belongs to an organisation but to no company', async () => {
    // Returning the whole organisation would open data that is not theirs.
    cookieJar.set('company-auth-token', 'admin-sin-empresa');
    await expect(requireScope()).rejects.toThrow(/empresa/);
  });

  it('refuses a session with no organisation', async () => {
    cookieJar.set('supercompany-auth-token', 'super-ok');
    await expect(requireScope()).rejects.toThrow(/organizationId/);
  });
});

describe('the organization account (ORG_ADMIN, #20)', () => {
  it('is its organization with no company, from its own session', async () => {
    cookieJar.set('organization-auth-token', 'org-ok');

    await expect(getCurrentTenant()).resolves.toEqual({
      organizationId: 'org-1',
      companyId: null,
      userRole: 'ORG_ADMIN',
      userId: 'u-org',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('is refused the dashboard scope: it has no company, and that panel is the companies\'', async () => {
    cookieJar.set('organization-auth-token', 'org-ok');
    await expect(requireScope()).rejects.toThrow(/empresa/);
  });

  it('is refused by a token that is not an organization one', async () => {
    cookieJar.set('organization-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).rejects.toThrow();
  });

  it('does not take a dashboard session for an organization one', async () => {
    cookieJar.set('company-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ userRole: 'ADMIN', companyId: 'co-1' });
  });
});
