'use server';

import { verifyAdminAuth } from '../users/helpers';
import { categoryRepository } from '@/infrastructure/prisma/repositories/CategoryRepositoryPrisma';
import { getCurrentTenant } from '@/lib/auth/tenant';

export async function getCategoriesWithItemCount() {
  try {
    await verifyAdminAuth();

    const tenant = await getCurrentTenant();
    
    // Si es SUPER_ADMIN sin organización específica, retornar vacío o todas
    // Por ahora, solo admins normales pueden ver el dashboard
    if (!tenant.organizationId) {
      return { success: true, categories: [] };
    }
    
    // Obtener categorías con su conteo de items
    const categories = await categoryRepository.findByOrganization(tenant.organizationId);
    
    // TODO: Agregar conteo de items por categoría al repositorio
    // Por ahora retornamos las categorías con itemCount = 0
    const categoriesWithCount = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      itemCount: 0 // TODO: Implementar conteo real
    }));
    
    return { success: true, categories: categoriesWithCount };
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      categories: []
    };
  }
}





