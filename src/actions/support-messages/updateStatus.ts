'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import type { SupportMessageStatus } from '@/domain/support-messages/types';
import { requireSuperAdmin } from './require-super-admin';

const STATUSES: readonly SupportMessageStatus[] = ['pending', 'read', 'resolved'];

export async function updateSupportMessageStatus(id: string, status: SupportMessageStatus) {
  await requireSuperAdmin();
  if (!STATUSES.includes(status)) {
    throw new Error(`Estado de mensaje de soporte no válido: ${status}`);
  }
  const record = await supportMessageRepository.updateStatus(id, status);
  return { success: true, id: record.id, status: record.status };
}
