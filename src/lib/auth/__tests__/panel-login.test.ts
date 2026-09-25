// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuthenticate } = vi.hoisted(() => ({ mockAuthenticate: vi.fn() }));

vi.stubEnv('SUPERADMIN_JWT_SECRET', 'a-secret-long-enough-for-hs256-tests');
vi.mock('../shared/utils', async () => {
  const actual = await vi.importActual<typeof import('../shared/utils')>('../shared/utils');
  return { ...actual, authenticateUser: mockAuthenticate };
});

const { authenticatePanel } = await import('../panel-login');

const user = (role: string, organizationId: string | null) => ({
  id: 'u-1', email: 'a@x.test', name: 'A', role, organizationId, companyId: null, context: 'admin' as const,
});

describe('authenticatePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives a platform account the platform session', async () => {
    mockAuthenticate.mockResolvedValue(user('SUPER_ADMIN', null));
    const result = await authenticatePanel('a@x.test', 'pw');

    expect(result).toMatchObject({ success: true, kind: 'superadmin', cookie: { name: 'superadmin-auth-token' } });
  });

  it('gives an organization account its own session, in its own cookie', async () => {
    mockAuthenticate.mockResolvedValue(user('ORG_ADMIN', 'org-1'));
    const result = await authenticatePanel('a@x.test', 'pw');

    expect(result).toMatchObject({ success: true, kind: 'organization', cookie: { name: 'organization-auth-token' } });
  });

  it('answers a company account exactly like a wrong password', async () => {
    mockAuthenticate.mockResolvedValue(user('ADMIN', 'org-1'));
    const refused = await authenticatePanel('a@x.test', 'pw');
    mockAuthenticate.mockResolvedValue(null);
    const wrong = await authenticatePanel('a@x.test', 'mala');

    expect(refused).toEqual(wrong);
    expect(refused.success).toBe(false);
  });

  it('refuses an organization account that has no organization', async () => {
    mockAuthenticate.mockResolvedValue(user('ORG_ADMIN', null));
    expect((await authenticatePanel('a@x.test', 'pw')).success).toBe(false);
  });
});
