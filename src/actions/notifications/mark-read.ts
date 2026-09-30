'use server';

import { notificationRepository } from '@/infrastructure/prisma/repositories/NotificationRepositoryPrisma';
import { getCurrentTenant, TenantContextNotFoundError } from '@/lib/auth/tenant';

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  try {
    const { userId } = await getCurrentTenant();
    await notificationRepository.markRead(id, userId);
    return { success: true };
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) return { success: false };
    throw error;
  }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  try {
    const { userId } = await getCurrentTenant();
    await notificationRepository.markAllRead(userId);
    return { success: true };
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) return { success: false };
    throw error;
  }
}
