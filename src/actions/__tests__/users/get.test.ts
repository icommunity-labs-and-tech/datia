import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserById } from '../../users/get';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireScope, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { UserNotFoundError } from '@/domain/users/errors';

vi.mock('../../users/helpers', () => ({
  verifyAdminAuth: vi.fn(async () => ({ id: 'admin-a', role: 'ADMIN', organizationId: 'org-a' })),
}));

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireScope: vi.fn(async () => ({ organizationId: 'org-a', companyId: 'co-a' })) };
});

vi.mock('@/infrastructure/prisma/repositories/UserRepositoryPrisma', () => ({
  userRepository: { getById: vi.fn() },
}));

const getById = userRepository.getById as unknown as ReturnType<typeof vi.fn>;
const user = (id: string, organizationId: string | null, companyId: string | null = organizationId ? 'co-a' : null) => ({
  id,
  organizationId,
  companyId,
  email: `${id}@example.com`,
  name: id,
  role: 'ADMIN',
  phone: '600000000',
  notes: 'privado',
  signsWithCertificate: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('getUserById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a user of the same organisation', async () => {
    getById.mockResolvedValueOnce(user('user-a', 'org-a'));

    await expect(getUserById('user-a')).resolves.toMatchObject({ success: true, user: { id: 'user-a' } });
  });

  it('does not return a user of another organisation', async () => {
    getById.mockResolvedValueOnce(user('user-b', 'org-b'));

    const result = await getUserById('user-b');

    expect(result).toEqual({ success: false, error: 'Usuario no encontrado' });
    expect(result).not.toHaveProperty('user');
  });

  it('answers another organisation exactly like a missing id', async () => {
    getById.mockResolvedValueOnce(user('user-b', 'org-b'));
    const foreign = await getUserById('user-b');

    getById.mockRejectedValueOnce(new UserNotFoundError('nope', 'Usuario no encontrado'));
    const missing = await getUserById('nope');

    expect(foreign).toEqual(missing);
  });

  it('does not return a user without organisation to an organisation admin', async () => {
    getById.mockResolvedValueOnce(user('superadmin', null));

    await expect(getUserById('superadmin')).resolves.toEqual({ success: false, error: 'Usuario no encontrado' });
  });

  it('does not return a user of another company of the same organisation', async () => {
    getById.mockResolvedValueOnce(user('user-c', 'org-a', 'co-b'));

    await expect(getUserById('user-c')).resolves.toEqual({ success: false, error: 'Usuario no encontrado' });
  });

  it('refuses without a session and never reads the user', async () => {
    (requireScope as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));

    await expect(getUserById('user-a')).resolves.toMatchObject({ success: false });
    expect(getById).not.toHaveBeenCalled();
  });
});
