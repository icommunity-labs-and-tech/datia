import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Activating a PENDING account during a block (#138) should not slip through
 * it: the same check `authenticateUser` applies at login applies here too, so
 * a company that got blocked right after an invitation went out still keeps
 * that invitation from landing an active session.
 */

const { findFirst, update } = vi.hoisted(() => ({ findFirst: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst, update } } }));

import { activateAccount } from '../../organizations/activate-account';

const baseUser = {
  id: 'u-1',
  email: 'ana@norte.test',
  name: 'Ana',
  role: 'ADMIN',
  organizationId: 'org-1',
  status: 'PENDING',
  activationExpiresAt: new Date(Date.now() + 60_000),
  Organization: { id: 'org-1', name: 'Norte', active: true },
  Company: { active: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue(baseUser);
  update.mockResolvedValue({ ...baseUser, status: 'ACTIVE' });
});

describe('activateAccount', () => {
  it('activates a pending account of an active company', async () => {
    const result = await activateAccount({ activationToken: 'tok', password: 'nueva1234' });
    expect(result.success).toBe(true);
  });

  it('refuses to activate an account whose company is blocked', async () => {
    findFirst.mockResolvedValue({ ...baseUser, Company: { active: false } });
    const result = await activateAccount({ activationToken: 'tok', password: 'nueva1234' });

    expect(result).toMatchObject({ success: false, error: 'La empresa está bloqueada' });
    expect(update).not.toHaveBeenCalled();
  });

  it('has no company to check for the organization account, and still activates', async () => {
    findFirst.mockResolvedValue({ ...baseUser, Company: null });
    const result = await activateAccount({ activationToken: 'tok', password: 'nueva1234' });
    expect(result.success).toBe(true);
  });
});
