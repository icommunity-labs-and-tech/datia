'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

const NOT_FOUND = 'Usuario no encontrado';

export async function getUserById(id: string) {
  try {
    await verifyAdminAuth();
    const organizationId = await requireOrganizationId();

    const user = await userRepository.getById(id);

    // getById looks the user up by id alone. An administrator only sees the
    // users of their own organisation; anyone else answers exactly like a
    // missing id, so the response does not reveal that it exists elsewhere.
    if (user.organizationId !== organizationId) {
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
