export type SupportMessageStatus = 'pending' | 'read' | 'resolved';

export interface SupportMessageRecord {
  id: string;
  subject: string;
  message: string;
  page: string | null;
  status: SupportMessageStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string | null;
  organizationId: string;
}

export interface SupportMessageListItem extends SupportMessageRecord {
  organizationName: string | null;
}

export interface CreateSupportMessageInput {
  organizationId: string;
  userId: string;
  userName: string | null;
  subject: string;
  message: string;
  page: string | null;
}
