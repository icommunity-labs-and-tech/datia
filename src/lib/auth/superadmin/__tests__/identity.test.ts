import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * In production, the only way in is the identity IAP already verified. Outside
 * production there is no IAP in front of `next dev`, so this falls back to the
 * password session the login route still issues there.
 */

const { mockVerifiedIapEmail, mockVerifySuperAdminJWT, mockFindUnique, cookieJar, headerJar } = vi.hoisted(() => ({
  mockVerifiedIapEmail: vi.fn(),
  mockVerifySuperAdminJWT: vi.fn(),
  mockFindUnique: vi.fn(),
  cookieJar: new Map<string, string>(),
  headerJar: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined) }),
  headers: async () => ({ get: (name: string) => headerJar.get(name) ?? null }),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: mockFindUnique } } }));
vi.mock('../iap', () => ({ verifiedIapEmail: mockVerifiedIapEmail }));
vi.mock('../jwt', () => ({ verifySuperAdminJWT: mockVerifySuperAdminJWT }));
vi.mock('../config', () => ({ superadminAuthConfig: { cookieName: 'superadmin-auth-token' } }));

const { currentSuperAdmin } = await import('../identity');

const activeSuperAdmin = { id: 'u-1', email: 'a@icommunity.io', name: 'A', role: 'SUPER_ADMIN', status: 'ACTIVE' };

beforeEach(() => {
  vi.clearAllMocks();
  cookieJar.clear();
  headerJar.clear();
});
afterEach(() => vi.unstubAllEnvs());

describe('currentSuperAdmin in production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));

  it('trusts the IAP-verified email once it maps to an active SUPER_ADMIN', async () => {
    headerJar.set('x-goog-iap-jwt-assertion', 'a-jwt');
    mockVerifiedIapEmail.mockResolvedValue('a@icommunity.io');
    mockFindUnique.mockResolvedValue(activeSuperAdmin);

    await expect(currentSuperAdmin()).resolves.toMatchObject({ id: 'u-1', role: 'SUPER_ADMIN' });
    expect(mockVerifiedIapEmail).toHaveBeenCalledWith('a-jwt');
  });

  it('never reads the password cookie, even if one happens to be present', async () => {
    cookieJar.set('superadmin-auth-token', 'leftover-from-before');
    mockVerifiedIapEmail.mockResolvedValue(null);

    await expect(currentSuperAdmin()).resolves.toBeNull();
    expect(mockVerifySuperAdminJWT).not.toHaveBeenCalled();
  });

  it('is null when IAP verified an identity with no matching user', async () => {
    mockVerifiedIapEmail.mockResolvedValue('nobody@icommunity.io');
    mockFindUnique.mockResolvedValue(null);
    await expect(currentSuperAdmin()).resolves.toBeNull();
  });

  it('is null when the verified identity exists but is not SUPER_ADMIN', async () => {
    mockVerifiedIapEmail.mockResolvedValue('org@icommunity.io');
    mockFindUnique.mockResolvedValue({ ...activeSuperAdmin, role: 'ORG_ADMIN' });
    await expect(currentSuperAdmin()).resolves.toBeNull();
  });

  it('is null when the matching account is not active', async () => {
    mockVerifiedIapEmail.mockResolvedValue('a@icommunity.io');
    mockFindUnique.mockResolvedValue({ ...activeSuperAdmin, status: 'PENDING' });
    await expect(currentSuperAdmin()).resolves.toBeNull();
  });
});

describe('currentSuperAdmin outside production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('falls back to the password-session cookie, same as before IAP', async () => {
    cookieJar.set('superadmin-auth-token', 'tok');
    mockVerifySuperAdminJWT.mockResolvedValue({ email: 'a@icommunity.io' });
    mockFindUnique.mockResolvedValue(activeSuperAdmin);

    await expect(currentSuperAdmin()).resolves.toMatchObject({ id: 'u-1' });
    expect(mockVerifiedIapEmail).not.toHaveBeenCalled();
  });

  it('is null with no cookie at all', async () => {
    await expect(currentSuperAdmin()).resolves.toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
