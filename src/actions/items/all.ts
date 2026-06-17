'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';

export async function getAllItems() {
  return await itemRepository.findAll();
}
