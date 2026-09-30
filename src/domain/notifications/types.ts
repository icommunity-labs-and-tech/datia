export type NotificationKind = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface NotificationRecord {
  id: string;
  userId: string;
  organizationId: string;
  type: NotificationKind;
  title: string;
  message: string;
  read: boolean;
  readAt: Date | null;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  type: NotificationKind;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}
