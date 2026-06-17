'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';

export async function deleteSupportMessage(id: string) {
  await supportMessageRepository.delete(id);
  return { success: true };
}
