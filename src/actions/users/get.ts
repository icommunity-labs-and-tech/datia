'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';

export async function getUserById(id: string) {
  try {
    await verifyAdminAuth();

    const user = await userRepository.getById(id);
    return { success: true, user };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
