'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function searchAssets(query: string) {
  const scope = await requireScope();
  return await assetRepository.search(query, scope);
}
