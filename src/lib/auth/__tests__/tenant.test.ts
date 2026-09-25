import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The two sessions use different cookies and can coexist in one browser: a
 * superadmin who also opens an organisation's dashboard carries both. Which one
 * answers "what organisation is this?" decides whether the dashboard works.
 */

const cookieJar = new Map<string, string>();
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));

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
        : token === 'org-admin'
          ? { id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1', companyId: null }
          : token === 'org-admin-con-empresa-residual'
            ? { id: 'u-org', role: 'ORG_ADMIN', organizationId: 'org-1', companyId: 'co-1' }
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

vi.mock('../admin/config', () => ({ adminAuthConfig: { cookieName: 'admin-auth-token' } }));
vi.mock('../superadmin/config', () => ({
  superadminAuthConfig: { cookieName: 'superadmin-auth-token' },
}));

const { getCurrentTenant, isSuperAdmin, requireOrganizationId, requireScope } = await import('../tenant');

beforeEach(() => {
  cookieJar.clear();
  findUnique.mockReset();
});

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

describe('company of the session (#20)', () => {
  it('reads the company from the token', async () => {
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('reads it from the account for a session issued before the token carried it', async () => {
    cookieJar.set('admin-auth-token', 'admin-sesion-antigua');
    findUnique.mockResolvedValue({ companyId: 'co-9' });
    await expect(getCurrentTenant()).resolves.toMatchObject({ companyId: 'co-9' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u-admin' }, select: { companyId: true } });
  });

  it('has no company for a superadmin', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    await expect(getCurrentTenant()).resolves.toMatchObject({ companyId: null });
  });
});

describe('requireScope', () => {
  it('scopes an account to its organisation and company', async () => {
    cookieJar.set('admin-auth-token', 'admin-ok');
    await expect(requireScope()).resolves.toEqual({ organizationId: 'org-1', companyId: 'co-1' });
  });

  it('refuses an account that belongs to an organisation but to no company', async () => {
    // Returning the whole organisation would open data that is not theirs.
    cookieJar.set('admin-auth-token', 'admin-sin-empresa');
    await expect(requireScope()).rejects.toThrow(/empresa/);
  });

  it('refuses a session with no organisation', async () => {
    cookieJar.set('superadmin-auth-token', 'super-ok');
    await expect(requireScope()).rejects.toThrow(/organizationId/);
  });
});

describe('the organization account (ORG_ADMIN, #20)', () => {
  it('has no company and sees the set of them', async () => {
    cookieJar.set('admin-auth-token', 'org-admin');
    await expect(getCurrentTenant()).resolves.toMatchObject({ organizationId: 'org-1', companyId: null, userRole: 'ORG_ADMIN' });
    await expect(requireScope()).resolves.toEqual({ organizationId: 'org-1', companyId: null });
  });

  it('is not narrowed to a company by a stale one in the token', async () => {
    cookieJar.set('admin-auth-token', 'org-admin-con-empresa-residual');
    await expect(requireScope()).resolves.toEqual({ organizationId: 'org-1', companyId: null });
  });

  it('does not read the account for a company: it has none', async () => {
    cookieJar.set('admin-auth-token', 'org-admin');
    await getCurrentTenant();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
