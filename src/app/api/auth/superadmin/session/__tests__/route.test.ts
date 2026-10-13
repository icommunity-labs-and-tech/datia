import { describe, it, expect, vi, beforeEach } from 'vitest';

/** A thin wrapper over currentSuperAdmin() (#20 follow-up) — its own tests cover the IAP-vs-cookie logic. */

const { mockCurrentSuperAdmin } = vi.hoisted(() => ({ mockCurrentSuperAdmin: vi.fn() }));
vi.mock('@/lib/auth/superadmin/identity', () => ({ currentSuperAdmin: mockCurrentSuperAdmin }));

import { GET } from '../route';

beforeEach(() => vi.clearAllMocks());

describe('GET /api/auth/superadmin/session', () => {
  it('returns the identity currentSuperAdmin resolves', async () => {
    mockCurrentSuperAdmin.mockResolvedValue({ id: 'u-1', email: 'a@x.test', name: 'A', role: 'SUPER_ADMIN' });
    const res = await GET();
    await expect(res.json()).resolves.toMatchObject({ user: { id: 'u-1' } });
  });

  it('returns a null user when there is no identity', async () => {
    mockCurrentSuperAdmin.mockResolvedValue(null);
    const res = await GET();
    await expect(res.json()).resolves.toEqual({ user: null });
  });

  it('returns a null user, not an error, if currentSuperAdmin throws', async () => {
    mockCurrentSuperAdmin.mockRejectedValue(new Error('boom'));
    const res = await GET();
    await expect(res.json()).resolves.toEqual({ user: null });
  });
});
