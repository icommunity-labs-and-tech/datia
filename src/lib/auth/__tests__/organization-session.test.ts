// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

/**
 * The organization account and the platform account share a panel and a secret,
 * and must never be able to pass for one another: a token of one kind opening
 * the other's session would hand an organization the platform's powers (#20).
 */

vi.stubEnv('SUPERADMIN_JWT_SECRET', 'a-secret-long-enough-for-hs256-tests');

const { signOrganizationJWT, verifyOrganizationJWT } = await import('../organization/jwt');
const { signSuperAdminJWT, verifySuperAdminJWT } = await import('../superadmin/jwt');

const base = { id: 'u-1', email: 'a@x.test', name: 'A', organizationId: 'org-1' };

describe('organization session', () => {
  it('signs and verifies an organization account', async () => {
    const token = await signOrganizationJWT({ ...base, role: 'ORG_ADMIN', context: 'organization' });
    await expect(verifyOrganizationJWT(token)).resolves.toMatchObject({ id: 'u-1', organizationId: 'org-1', role: 'ORG_ADMIN' });
  });

  it('is not accepted as a platform session', async () => {
    const token = await signOrganizationJWT({ ...base, role: 'ORG_ADMIN', context: 'organization' });
    await expect(verifySuperAdminJWT(token)).resolves.toBeNull();
  });

  it('is not what a platform token can pass for', async () => {
    const token = await signSuperAdminJWT({ ...base, organizationId: null, role: 'SUPER_ADMIN', context: 'superadmin' });
    await expect(verifyOrganizationJWT(token)).resolves.toBeNull();
  });

  it('refuses a token that claims another role, even signed as an organization one', async () => {
    const token = await signOrganizationJWT({ ...base, role: 'SUPER_ADMIN', context: 'organization' });
    await expect(verifyOrganizationJWT(token)).resolves.toBeNull();
  });

  it('refuses an organization token without an organization to operate', async () => {
    const token = await signOrganizationJWT({ ...base, organizationId: null, role: 'ORG_ADMIN', context: 'organization' });
    await expect(verifyOrganizationJWT(token)).resolves.toBeNull();
  });

  it('refuses a token of the wrong context', async () => {
    const token = await signOrganizationJWT({ ...base, role: 'ORG_ADMIN', context: 'admin' });
    await expect(verifyOrganizationJWT(token)).resolves.toBeNull();
  });

  it('refuses garbage', async () => {
    await expect(verifyOrganizationJWT('nope')).resolves.toBeNull();
  });
});
