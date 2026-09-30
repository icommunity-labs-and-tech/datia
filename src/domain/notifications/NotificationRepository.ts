import type { CreateNotificationInput, NotificationRecord } from './types';

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  createMany(inputs: CreateNotificationInput[]): Promise<void>;
  listForUser(userId: string, limit?: number): Promise<NotificationRecord[]>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
