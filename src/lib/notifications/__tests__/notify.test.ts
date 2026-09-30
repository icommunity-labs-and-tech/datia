import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { notificationRepository } from '@/infrastructure/prisma/repositories/NotificationRepositoryPrisma';
import { notifyUser, notifyCompany } from '../notify';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: vi.fn(async () => []) } },
}));

vi.mock('@/infrastructure/prisma/repositories/NotificationRepositoryPrisma', () => ({
  notificationRepository: {
    create: vi.fn(async () => undefined),
    createMany: vi.fn(async () => undefined),
  },
}));

const findMany = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>;
const create = notificationRepository.create as ReturnType<typeof vi.fn>;
const createMany = notificationRepository.createMany as ReturnType<typeof vi.fn>;

const content = { type: 'INFO' as const, title: 'Título', message: 'Mensaje' };

describe('notifyUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates one notification for the given user', async () => {
    await notifyUser('user-1', 'org-1', content);
    expect(create).toHaveBeenCalledWith({ userId: 'user-1', organizationId: 'org-1', ...content });
  });
});

describe('notifyCompany', () => {
  beforeEach(() => vi.clearAllMocks());

  it('notifies every account of the company when there is one', async () => {
    findMany.mockResolvedValueOnce([{ id: 'user-1' }, { id: 'user-2' }]);

    await notifyCompany('org-1', 'co-1', content);

    expect(findMany).toHaveBeenCalledWith({ where: { companyId: 'co-1' }, select: { id: true } });
    expect(createMany).toHaveBeenCalledWith([
      { userId: 'user-1', organizationId: 'org-1', ...content },
      { userId: 'user-2', organizationId: 'org-1', ...content },
    ]);
  });

  it('falls back to the organisation ORG_ADMIN accounts when there is no company', async () => {
    findMany.mockResolvedValueOnce([{ id: 'org-admin-1' }]);

    await notifyCompany('org-1', null, content);

    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', companyId: null, role: 'ORG_ADMIN' },
      select: { id: true },
    });
    expect(createMany).toHaveBeenCalledWith([{ userId: 'org-admin-1', organizationId: 'org-1', ...content }]);
  });

  it('does nothing when nobody matches, without an empty write', async () => {
    findMany.mockResolvedValueOnce([]);

    await notifyCompany('org-1', 'co-1', content);

    expect(createMany).not.toHaveBeenCalled();
  });
});
