'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import type { SupportMessageStatus } from '@/domain/support-messages/types';

export async function updateSupportMessageStatus(id: string, status: SupportMessageStatus) {
  const record = await supportMessageRepository.updateStatus(id, status);
  return { success: true, id: record.id, status: record.status };
}
