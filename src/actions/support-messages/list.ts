'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';

export async function listSupportMessages() {
  const messages = await supportMessageRepository.findAll();
  return messages;
}
