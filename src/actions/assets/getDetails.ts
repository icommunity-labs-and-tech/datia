'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getAssetDetails(id: string) {
  const organizationId = await requireOrganizationId();
  return await assetRepository.getDetails(id, organizationId);
}
