'use server';

import { revalidatePath } from 'next/cache';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function deleteAsset(id: string) {
  try {
    const scope = await requireScope();
    const asset = await assetRepository.getById(id, scope);
    if (!asset) {
      throw new Error('Activo no encontrado');
    }
    
    await assetRepository.delete(id, scope);

    revalidatePath(`/dashboard/assets`);
    // Note: categoryId is not in AssetRecord, may need to fetch separately if needed

    return {
      success: true,
      message: 'Item eliminado correctamente',
    };
  } catch (error) {
    console.error('Error eliminando asset:', error);
    throw error;
  }
}
