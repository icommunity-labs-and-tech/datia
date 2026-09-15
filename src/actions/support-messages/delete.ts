'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import { requireSuperAdmin } from './require-super-admin';

export async function deleteSupportMessage(id: string) {
  await requireSuperAdmin();
  await supportMessageRepository.delete(id);
  return { success: true };
}
