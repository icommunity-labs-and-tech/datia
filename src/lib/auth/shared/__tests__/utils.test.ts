import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hash } from 'bcryptjs';

/**
 * A blocked company (#138) cuts off its accounts without touching their row:
 * `authenticateUser` must refuse them the same way it refuses an inactive
 * account, by reading the company through the relation rather than a second
 * query.
 */

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));

import { authenticateUser } from '../utils';

const password = 'correcta123';
let passwordHash: string;

const baseUser = {
  id: 'u-1',
  email: 'ana@norte.test',
  name: 'Ana',
  role: 'ADMIN',
  organizationId: 'org-1',
  companyId: 'co-1',
  status: 'ACTIVE',
  Company: { active: true },
};

beforeEach(async () => {
  vi.clearAllMocks();
  passwordHash = await hash(password, 4);
  findUnique.mockResolvedValue({ ...baseUser, password: passwordHash });
});

describe('authenticateUser', () => {
  it('authenticates an active account of an active company', async () => {
    const result = await authenticateUser('ana@norte.test', password);
    expect(result).toMatchObject({ id: 'u-1', companyId: 'co-1' });
  });

  it('refuses an account whose company is blocked', async () => {
    findUnique.mockResolvedValue({ ...baseUser, password: passwordHash, Company: { active: false } });
    expect(await authenticateUser('ana@norte.test', password)).toBeNull();
  });

  it('has no company to check for the organization account, and still authenticates', async () => {
    findUnique.mockResolvedValue({ ...baseUser, password: passwordHash, companyId: null, Company: null });
    const result = await authenticateUser('ana@norte.test', password);
    expect(result).toMatchObject({ id: 'u-1', companyId: null });
  });

  it('still refuses a suspended account regardless of its company', async () => {
    findUnique.mockResolvedValue({ ...baseUser, password: passwordHash, status: 'PENDING' });
    expect(await authenticateUser('ana@norte.test', password)).toBeNull();
  });

  it('refuses the wrong password', async () => {
    expect(await authenticateUser('ana@norte.test', 'mala')).toBeNull();
  });
});
