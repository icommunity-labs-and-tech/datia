import type { SupportMessageRecord, SupportMessageListItem, CreateSupportMessageInput, SupportMessageStatus } from './types';

export interface SupportMessageRepository {
  create(input: CreateSupportMessageInput): Promise<SupportMessageRecord>;
  findById(id: string): Promise<SupportMessageRecord | null>;
  findAll(): Promise<SupportMessageListItem[]>;
  findByOrganization(organizationId: string): Promise<SupportMessageRecord[]>;
  updateStatus(id: string, status: SupportMessageStatus): Promise<SupportMessageRecord>;
  delete(id: string): Promise<void>;
}
