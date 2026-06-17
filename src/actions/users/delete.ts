'use server';

import { revalidatePath } from 'next/cache';
import { verifyAdminAuth } from './helpers';
import { createUserServiceImpl } from '@/domain/users/UserServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';

export async function deleteUser(id: string) {
  try {
    const payload = await verifyAdminAuth();
    if (payload.id === id) {
      throw new Error('No puedes eliminar tu propia cuenta');
    }

    const userService = createUserServiceImpl({
      userRepository,
    });
    await userService.deleteUser(id);

    revalidatePath('/dashboard/users');

    return {
      success: true,
      message: 'Usuario eliminado correctamente'
    };
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
