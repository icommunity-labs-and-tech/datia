import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * In production, the only way in is the identity IAP already verified —
 * IAP's own IAM policy is the access list, not a matching `User` row (#146
 * follow-up). Outside production there is no IAP in front of `next dev`, so
 * this falls back to the password session the login route still issues
 * there, already gated by role/status at login time.
 */

const { mockVerifiedIapEmail, mockVerifySuperAdminJWT, cookieJar, headerJar } = vi.hoisted(() => ({
  mockVerifiedIapEmail: vi.fn(),
  mockVerifySuperAdminJWT: vi.fn(),
  cookieJar: new Map<string, string>(),
  headerJar: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }),
  headers: async () => ({ get: (name: string) => headerJar.get(name) ?? null }),
}));
vi.mock('../iap', () => ({ verifiedIapEmail: mockVerifiedIapEmail }));
vi.mock('../jwt', () => ({ verifySuperAdminJWT: mockVerifySuperAdminJWT }));
vi.mock('../config', () => ({ superadminAuthConfig: { cookieName: 'superadmin-auth-token' } }));

const { currentSuperAdmin } = await import('../identity');

beforeEach(() => {
  vi.clearAllMocks();
  cookieJar.clear();
  headerJar.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe('currentSuperAdmin in production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));

  it('trusts the IAP-verified email with no User row required', async () => {
    headerJar.set('x-goog-iap-jwt-assertion', 'a-jwt');
    mockVerifiedIapEmail.mockResolvedValue('a@icommunity.io');

    await expect(currentSuperAdmin()).resolves.toEqual({
      id: 'a@icommunity.io',
      email: 'a@icommunity.io',
      name: 'a',
      role: 'SUPER_ADMIN',
    });
    expect(mockVerifiedIapEmail).toHaveBeenCalledWith('a-jwt');
  });

  it('never reads the password cookie, even if one happens to be present', async () => {
    cookieJar.set('superadmin-auth-token', 'leftover-from-before');
    mockVerifiedIapEmail.mockResolvedValue(null);

    await expect(currentSuperAdmin()).resolves.toBeNull();
    expect(mockVerifySuperAdminJWT).not.toHaveBeenCalled();
  });

  it('is null when IAP verifies nothing (missing, malformed or expired assertion)', async () => {
    mockVerifiedIapEmail.mockResolvedValue(null);
    await expect(currentSuperAdmin()).resolves.toBeNull();
  });
});

describe('currentSuperAdmin outside production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('trusts the password-session cookie, already gated by role/status at login', async () => {
    cookieJar.set('superadmin-auth-token', 'tok');
    mockVerifySuperAdminJWT.mockResolvedValue({ id: 'u-1', email: 'a@icommunity.io', name: 'A' });

    await expect(currentSuperAdmin()).resolves.toEqual({
      id: 'u-1',
      email: 'a@icommunity.io',
      name: 'A',
      role: 'SUPER_ADMIN',
    });
    expect(mockVerifiedIapEmail).not.toHaveBeenCalled();
  });

  it('is null with no cookie at all', async () => {
    await expect(currentSuperAdmin()).resolves.toBeNull();
    expect(mockVerifySuperAdminJWT).not.toHaveBeenCalled();
  });

  it('is null when the cookie fails verification', async () => {
    cookieJar.set('superadmin-auth-token', 'bad-token');
    mockVerifySuperAdminJWT.mockResolvedValue(null);
    await expect(currentSuperAdmin()).resolves.toBeNull();
  });
});
