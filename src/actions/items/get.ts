'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getItem(id: string) {
  if (!id) {
    throw new Error('ID de item requerido');
  }

  const organizationId = await requireOrganizationId();
  const item = await itemRepository.getById(id, organizationId);
  
  if (!item) {
    throw new Error('Item no encontrado');
  }
  
  // Obtener categorías del item solo si el item existe
  let categories: Array<{ id: string; name: string }> = [];
  try {
    categories = await itemRepository.getItemCategories(id, organizationId);
  } catch {
    // Si hay error obteniendo categorías, continuar con array vacío
    // No lanzar error para no interrumpir la carga de la página
    categories = [];
  }
  
  return {
    ...item,
    categories: categories,
  };
}
