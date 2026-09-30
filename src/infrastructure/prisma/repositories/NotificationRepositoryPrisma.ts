import type { NotificationRepository } from '@/domain/notifications/NotificationRepository';
import type { CreateNotificationInput, NotificationRecord } from '@/domain/notifications/types';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const toDomain = (row: any): NotificationRecord => ({
  id: row.id,
  userId: row.userId,
  organizationId: row.organizationId,
  type: row.type,
  title: row.title,
  message: row.message,
  read: row.read,
  readAt: row.readAt,
  data: row.data ?? null,
  createdAt: row.createdAt,
});

export const notificationRepository: NotificationRepository = {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const row = await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId,
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? undefined) as any,
      },
    });
    return toDomain(row);
  },

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        id: crypto.randomUUID(),
        userId: input.userId,
        organizationId: input.organizationId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? undefined) as any,
      })),
    });
  },

  async listForUser(userId: string, limit = 20): Promise<NotificationRecord[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toDomain);
  },

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  },

  async markRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  },

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  },
};
