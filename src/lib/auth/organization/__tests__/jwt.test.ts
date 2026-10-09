// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuthenticateUser } = vi.hoisted(() => ({ mockAuthenticateUser: vi.fn() }));

vi.stubEnv('SUPERADMIN_JWT_SECRET', 'a-secret-long-enough-for-hs256-tests');
vi.mock('../../shared/utils', async () => {
  const actual = await vi.importActual<typeof import('../../shared/utils')>('../../shared/utils');
  return { ...actual, authenticateUser: mockAuthenticateUser };
});

const { authenticateOrganization } = await import('../jwt');

const user = (role: string, organizationId: string | null) => ({
  id: 'u-1', email: 'a@x.test', name: 'A', role, organizationId, companyId: null, context: 'admin' as const,
});

describe('authenticateOrganization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives an organization account its own session', async () => {
    mockAuthenticateUser.mockResolvedValue(user('ORG_ADMIN', 'org-1'));
    const result = await authenticateOrganization('a@x.test', 'pw');
    expect(result).toMatchObject({ success: true, user: { role: 'ORG_ADMIN' } });
    expect(result.token).toBeTruthy();
  });

  it('answers a non-organization role exactly like a wrong password', async () => {
    mockAuthenticateUser.mockResolvedValue(user('SUPER_ADMIN', null));
    const refused = await authenticateOrganization('a@x.test', 'pw');
    mockAuthenticateUser.mockResolvedValue(null);
    const wrong = await authenticateOrganization('a@x.test', 'mala');

    expect(refused).toEqual(wrong);
    expect(refused.success).toBe(false);
  });

  it('refuses an organization account that has no organization', async () => {
    mockAuthenticateUser.mockResolvedValue(user('ORG_ADMIN', null));
    expect((await authenticateOrganization('a@x.test', 'pw')).success).toBe(false);
  });
});
