'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

const NOT_FOUND = 'Usuario no encontrado';

export async function getUserById(id: string) {
  try {
    await verifyAdminAuth();
    const scope = await requireScope();

    const user = await userRepository.getById(id);

    // getById looks the user up by id alone. An account only sees the users of
    // its own company; anyone else answers exactly like a missing id, so the
    // response does not reveal that it exists elsewhere.
    if (user.organizationId !== scope.organizationId || (scope.companyId && user.companyId !== scope.companyId)) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
