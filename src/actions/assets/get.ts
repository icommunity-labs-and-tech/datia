'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getAsset(id: string) {
  if (!id) {
    throw new Error('ID de activo requerido');
  }

  const organizationId = await requireOrganizationId();
  const asset = await assetRepository.getById(id, organizationId);
  
  if (!asset) {
    throw new Error('Activo no encontrado');
  }
  
  return { ...asset };
}
