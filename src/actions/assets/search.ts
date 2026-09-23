'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function searchAssets(query: string) {
  const organizationId = await requireOrganizationId();
  return await assetRepository.search(query, organizationId);
}
