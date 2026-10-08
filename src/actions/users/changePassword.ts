'use server';

import { revalidatePath } from 'next/cache';
import { createUserServiceImpl } from '@/domain/users/UserServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { verifyUserAuth } from './helpers';
import { InvalidCredentialsError, PasswordValidationError, UserNotFoundError } from '@/domain/users/errors';

export async function changePassword(formData: FormData) {
  try {
    const payload = await verifyUserAuth();

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const userService = createUserServiceImpl({
      userRepository,
    });
    await userService.changePassword({ userId: payload.id, currentPassword, newPassword, confirmPassword });

    // Whichever panel the caller signed in from; revalidating the other is a
    // no-op, not an error.
    revalidatePath('/dashboard/profile');
    revalidatePath('/organization/settings');

    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError || error instanceof PasswordValidationError || error instanceof UserNotFoundError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
