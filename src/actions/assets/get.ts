'use server';

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function getAsset(id: string) {
  if (!id) {
    throw new Error('ID de activo requerido');
  }

  const scope = await requireScope();
  const asset = await assetRepository.getById(id, scope);
  
  if (!asset) {
    throw new Error('Activo no encontrado');
  }
  
  return { ...asset };
}
