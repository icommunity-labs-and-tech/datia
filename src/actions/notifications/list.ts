'use server';

import { notificationRepository } from '@/infrastructure/prisma/repositories/NotificationRepositoryPrisma';
import { getCurrentTenant, TenantContextNotFoundError } from '@/lib/auth/tenant';
import type { NotificationRecord } from '@/domain/notifications/types';

export interface NotificationsPanel {
  items: NotificationRecord[];
  unreadCount: number;
}

/** The current user's own notifications, newest first (#28). */
export async function listNotifications(): Promise<NotificationsPanel> {
  let userId: string;
  try {
    ({ userId } = await getCurrentTenant());
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) return { items: [], unreadCount: 0 };
    throw error;
  }

  const [items, unreadCount] = await Promise.all([
    notificationRepository.listForUser(userId),
    notificationRepository.countUnread(userId),
  ]);
  return { items, unreadCount };
}

/** Just the count, for polling without paying for the full list each time. */
export async function unreadNotificationCount(): Promise<number> {
  try {
    const { userId } = await getCurrentTenant();
    return await notificationRepository.countUnread(userId);
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) return 0;
    throw error;
  }
}
