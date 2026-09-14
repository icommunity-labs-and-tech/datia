import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The two sessions use different cookies and can coexist in one browser: a
 * superadmin who also opens an organisation's dashboard carries both. Which one
 * answers "what organisation is this?" decides whether the dashboard works.
 */

const cookieJar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
  }),
}));

vi.mock('../admin/jwt', () => ({
  verifyAdminJWT: async (token: string) =>
    token === 'admin-ok'
      ? { id: 'u-admin', role: 'ADMIN', organizationId: 'org-1' }
      : token === 'admin-sin-org'
        ? { id: 'u-admin', role: 'ADMIN', organizationId: undefined }
        : null,
}));

vi.mock('../superadmin/jwt', () => ({
  verifySuperAdminJWT: async (token: string) =>
    token === 'super-ok' ? { id: 'u-super', role: 'SUPER_ADMIN' } : null,
}));

vi.mock('../admin/config', () => ({ adminAuthConfig: { cookieName: 'admin-auth-token' } }));
vi.mock('../superadmin/config', () => ({
  superadminAuthConfig: { cookieName: 'superadmin-auth-token' },
}));

const { getCurrentTenant, isSuperAdmin, requireOrganizationId } = await import('../tenant');

beforeEach(() => cookieJar.clear());

describe('getCurrentTenant', () => {
  it('resolves the organisation from an admin session', async () => {
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({
      organizationId: 'org-1',
      userRole: 'ADMIN',
    });
  });

  it('has no organisation for a superadmin session', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({
      organizationId: null,
      userRole: 'SUPER_ADMIN',
    });
  });

  it('prefers the admin session when both cookies are present', async () => {
    // The bug: a superadmin who also had a dashboard session got no
    // organisation, and every scoped operation failed on a valid admin session.
    cookieJar.set('superadmin-auth-token', 'super-ok');
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: 'org-1' });
  });

  it('falls back to the superadmin session when the admin one carries no organisation', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    cookieJar.set('admin-auth-token', 'admin-sin-org');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: null });
  });

  it('throws when neither session is valid', async () => {
    cookieJar.set('admin-auth-token', 'caducado');
    await expect(getCurrentTenant()).rejects.toThrow();
  });
});

describe('requireOrganizationId', () => {
  it('returns the organisation of an admin session', async () => {
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(requireOrganizationId()).resolves.toBe('org-1');
  });

  it('still refuses a superadmin-only session, which has no organisation', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    await expect(requireOrganizationId()).rejects.toThrow(/organizationId/);
  });

  it('no longer fails when both sessions are open', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    cookieJar.set('admin-auth-token', 'admin-ok');
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
  it('is true for a superadmin session', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    await expect(isSuperAdmin()).resolves.toBe(true);
  });

  it('stays true when an admin session is open alongside it', async () => {
    // Scoping now prefers the admin session; privileges must not follow it.
    cookieJar.set('superadmin-auth-token', 'super-ok');
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(isSuperAdmin()).resolves.toBe(true);
  });

  it('is false for an admin session alone', async () => {
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(isSuperAdmin()).resolves.toBe(false);
  });

  it('is false with no session at all', async () => {
    await expect(isSuperAdmin()).resolves.toBe(false);
  });
});
