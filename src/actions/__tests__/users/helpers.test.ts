import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyUserAuth } from '../../users/helpers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { verifyOrganizationJWT } from '@/lib/auth/organization/jwt';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { value };
    },
  })),
}));

vi.mock('@/lib/auth/admin/jwt', () => ({
  verifyAdminJWT: vi.fn(),
}));

vi.mock('@/lib/auth/organization/jwt', () => ({
  verifyOrganizationJWT: vi.fn(),
}));

const mockedVerifyAdminJWT = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>;
const mockedVerifyOrganizationJWT = verifyOrganizationJWT as unknown as ReturnType<typeof vi.fn>;

describe('verifyUserAuth', () => {
  beforeEach(() => {
    cookieStore.clear();
    mockedVerifyAdminJWT.mockReset();
    mockedVerifyOrganizationJWT.mockReset();
  });

  it('accepts a company (ADMIN) session', async () => {
    cookieStore.set('company-auth-token', 'token-company');
    mockedVerifyAdminJWT.mockResolvedValue({ id: 'u-1', role: 'ADMIN', organizationId: 'org-a', companyId: 'co-a' });

    const payload = await verifyUserAuth();

    expect(payload.id).toBe('u-1');
    expect(mockedVerifyOrganizationJWT).not.toHaveBeenCalled();
  });

  it('accepts a superadmin session', async () => {
    cookieStore.set('company-auth-token', 'token-superadmin');
    mockedVerifyAdminJWT.mockResolvedValue({ id: 'u-2', role: 'SUPER_ADMIN', organizationId: null });

    const payload = await verifyUserAuth();

    expect(payload.id).toBe('u-2');
  });

  it('accepts an organization (ORG_ADMIN) session', async () => {
    cookieStore.set('organization-auth-token', 'token-org');
    mockedVerifyOrganizationJWT.mockResolvedValue({ id: 'u-3', role: 'ORG_ADMIN', organizationId: 'org-a', companyId: null });

    const payload = await verifyUserAuth();

    expect(payload.id).toBe('u-3');
    expect(mockedVerifyAdminJWT).not.toHaveBeenCalled();
  });

  it('falls back to the organization cookie when the company token is present but invalid', async () => {
    cookieStore.set('company-auth-token', 'stale-token');
    cookieStore.set('organization-auth-token', 'token-org');
    mockedVerifyAdminJWT.mockResolvedValue(null);
    mockedVerifyOrganizationJWT.mockResolvedValue({ id: 'u-4', role: 'ORG_ADMIN', organizationId: 'org-a', companyId: null });

    const payload = await verifyUserAuth();

    expect(payload.id).toBe('u-4');
  });

  it('rejects a company token whose role is neither ADMIN nor SUPER_ADMIN', async () => {
    cookieStore.set('company-auth-token', 'token-org-admin');
    mockedVerifyAdminJWT.mockResolvedValue({ id: 'u-5', role: 'ORG_ADMIN', organizationId: 'org-a' });

    await expect(verifyUserAuth()).rejects.toThrow('No autorizado');
  });

  it('rejects when neither cookie is present', async () => {
    await expect(verifyUserAuth()).rejects.toThrow('No autorizado');
    expect(mockedVerifyAdminJWT).not.toHaveBeenCalled();
    expect(mockedVerifyOrganizationJWT).not.toHaveBeenCalled();
  });

  it('rejects when both cookies verify to null', async () => {
    cookieStore.set('company-auth-token', 'bad-company');
    cookieStore.set('organization-auth-token', 'bad-org');
    mockedVerifyAdminJWT.mockResolvedValue(null);
    mockedVerifyOrganizationJWT.mockResolvedValue(null);

    await expect(verifyUserAuth()).rejects.toThrow('No autorizado');
  });
});
