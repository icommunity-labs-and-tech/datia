'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import type { SupportMessageStatus } from '@/domain/support-messages/types';
import { requireSuperAdmin } from './require-super-admin';
import { notifyUser } from '@/lib/notifications/notify';

const STATUSES: readonly SupportMessageStatus[] = ['pending', 'read', 'resolved'];

const STATUS_TITLE: Record<SupportMessageStatus, string> = {
  pending: 'Tu mensaje de soporte está pendiente',
  read: 'Tu mensaje de soporte ha sido leído',
  resolved: 'Tu mensaje de soporte se ha resuelto',
};

export async function updateSupportMessageStatus(id: string, status: SupportMessageStatus) {
  await requireSuperAdmin();
  if (!STATUSES.includes(status)) {
    throw new Error(`Estado de mensaje de soporte no válido: ${status}`);
  }

  const previous = await supportMessageRepository.findById(id);
  const record = await supportMessageRepository.updateStatus(id, status);

  if (previous && previous.status !== status) {
    await notifyUser(record.userId, record.organizationId, {
      type: status === 'resolved' ? 'SUCCESS' : 'INFO',
      title: STATUS_TITLE[status],
      message: `«${record.subject}»`,
      data: { supportMessageId: record.id },
    });
  }

  return { success: true, id: record.id, status: record.status };
}
