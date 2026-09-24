'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { getCurrentTenant, requireScope } from '@/lib/auth/tenant';

export async function getUsers() {
  try {
    await verifyAdminAuth();

    const tenant = await getCurrentTenant();
    
    // Si es SUPER_ADMIN, puede ver todos los usuarios
    if (tenant.userRole === 'SUPER_ADMIN') {
      const users = await userRepository.findAll();
      return { success: true, users };
    }
    
    // Si es ADMIN, solo ve las cuentas de su alcance: su empresa
    if (!tenant.organizationId) {
      throw new Error('ADMIN debe tener una organización asignada');
    }
    
    const users = await userRepository.findByOrganization(await requireScope());
    return { success: true, users };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      users: []
    };
  }
}
