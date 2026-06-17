'use server';

import { revalidatePath } from 'next/cache';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function deleteItem(id: string) {
  try {
    const organizationId = await requireOrganizationId();
    const item = await itemRepository.getById(id, organizationId);
    if (!item) {
      throw new Error('Item no encontrado');
    }
    
    await itemRepository.delete(id, organizationId);

    revalidatePath(`/dashboard/items`);
    // Note: categoryId is not in ItemRecord, may need to fetch separately if needed

    return {
      success: true,
      message: 'Item eliminado correctamente',
    };
  } catch (error) {
    console.error('Error eliminando item:', error);
    throw error;
  }
}
