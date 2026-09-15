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

/** Upper bounds for what a user can send, enforced by the form and the action. */
export const SUPPORT_MESSAGE_LIMITS = {
  subject: 150,
  message: 5000,
  page: 500,
} as const;
