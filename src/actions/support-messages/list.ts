'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import { requireSuperAdmin } from './require-super-admin';

export async function listSupportMessages() {
  await requireSuperAdmin();
  const messages = await supportMessageRepository.findAll();
  return messages;
}
