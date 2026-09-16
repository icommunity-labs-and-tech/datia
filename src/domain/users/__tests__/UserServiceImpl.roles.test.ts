import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRepository } from '@/domain/users/UserRepository';
import { UserInputError } from '@/domain/users/errors';

vi.mock('@/actions/users/helpers', () => ({
  verifyAdminAuth: vi.fn(async () => ({ id: 'admin-a', role: 'ADMIN', organizationId: 'org-a' })),
  verifyUserAuth: vi.fn(),
  generateTemporaryPassword: vi.fn(() => 'Temporal2345'),
}));
vi.mock('@/lib/auth/tenant', () => ({
  requireOrganizationId: vi.fn(async () => 'org-a'),
}));

import { createUserServiceImpl } from '@/domain/users/UserServiceImpl';

const record = {
  id: 'user-1', organizationId: 'org-a', email: 'a@example.com', name: 'A', role: 'ADMIN',
  phone: null, notes: null, signsWithCertificate: false,
};

function makeRepo() {
  return {
    getByEmail: vi.fn(async () => { throw new Error('no existe'); }),
    create: vi.fn(async () => record),
    update: vi.fn(async () => record),
  } as unknown as UserRepository & { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
}

describe('UserService: roles asignables desde una organización', () => {
  let repo: ReturnType<typeof makeRepo>;
  beforeEach(() => { repo = makeRepo(); });

  it('crea usuarios ADMIN', async () => {
    const service = createUserServiceImpl({ userRepository: repo });
    await service.createUser({ email: 'a@example.com', name: 'A', role: 'ADMIN' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN', organizationId: 'org-a' }));
  });

  it.each(['SUPER_ADMIN', '', null, undefined])('no crea usuarios con rol %s', async (role) => {
    const service = createUserServiceImpl({ userRepository: repo });
    await expect(
      service.createUser({ email: 'a@example.com', name: 'A', role: role as 'ADMIN' }),
    ).rejects.toBeInstanceOf(UserInputError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('no asciende a SUPER_ADMIN al actualizar', async () => {
    const service = createUserServiceImpl({ userRepository: repo });
    await expect(
      service.updateUser({ id: 'admin-a', role: 'SUPER_ADMIN' as 'ADMIN' }),
    ).rejects.toBeInstanceOf(UserInputError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('actualiza sin rol o con ADMIN', async () => {
    const service = createUserServiceImpl({ userRepository: repo });
    await service.updateUser({ id: 'user-1', name: 'B' });
    await service.updateUser({ id: 'user-1', role: 'ADMIN' });
    expect(repo.update).toHaveBeenCalledTimes(2);
  });
});
