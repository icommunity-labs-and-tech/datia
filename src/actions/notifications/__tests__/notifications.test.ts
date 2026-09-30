import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationRepository } from '@/infrastructure/prisma/repositories/NotificationRepositoryPrisma';
import { getCurrentTenant, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { listNotifications, unreadNotificationCount } from '../list';
import { markNotificationRead, markAllNotificationsRead } from '../mark-read';

vi.mock('@/infrastructure/prisma/repositories/NotificationRepositoryPrisma', () => ({
  notificationRepository: {
    listForUser: vi.fn(async () => [{ id: 'notif-1' }]),
    countUnread: vi.fn(async () => 2),
    markRead: vi.fn(async () => undefined),
    markAllRead: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return {
    ...actual,
    getCurrentTenant: vi.fn(async () => ({ organizationId: 'org-1', companyId: null, userId: 'user-1', userRole: 'ADMIN' })),
  };
});

const repo = notificationRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('listNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the current user’s notifications and unread count', async () => {
    await expect(listNotifications()).resolves.toEqual({ items: [{ id: 'notif-1' }], unreadCount: 2 });
    expect(repo.listForUser).toHaveBeenCalledWith('user-1');
    expect(repo.countUnread).toHaveBeenCalledWith('user-1');
  });

  it('returns an empty panel without a session, instead of throwing', async () => {
    (getCurrentTenant as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));
    await expect(listNotifications()).resolves.toEqual({ items: [], unreadCount: 0 });
  });
});

describe('unreadNotificationCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the count for the current user', async () => {
    await expect(unreadNotificationCount()).resolves.toBe(2);
  });

  it('returns 0 without a session', async () => {
    (getCurrentTenant as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));
    await expect(unreadNotificationCount()).resolves.toBe(0);
  });
});

describe('markNotificationRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks one notification of the current user as read', async () => {
    await expect(markNotificationRead('notif-1')).resolves.toEqual({ success: true });
    expect(repo.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('reports failure without a session, instead of throwing', async () => {
    (getCurrentTenant as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));
    await expect(markNotificationRead('notif-1')).resolves.toEqual({ success: false });
  });
});

describe('markAllNotificationsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks every notification of the current user as read', async () => {
    await expect(markAllNotificationsRead()).resolves.toEqual({ success: true });
    expect(repo.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
