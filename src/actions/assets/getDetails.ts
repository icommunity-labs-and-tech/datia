'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function getAssetDetails(id: string) {
  const scope = await requireScope();
  return await assetRepository.getDetails(id, scope);
}
