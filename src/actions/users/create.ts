'use server';

import { revalidatePath } from 'next/cache';
import { createUserServiceImpl } from '@/domain/users/UserServiceImpl';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { AuthorizationError, UserAlreadyExistsError, UserInputError } from '@/domain/users/errors';

export async function createUser(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as 'ADMIN';
    const phone = (formData.get('phone') as string) || null;
    const notes = (formData.get('notes') as string) || null;

    const userService = createUserServiceImpl({
      userRepository,
    });
    const result = await userService.createUser({ email, name, role, phone, notes });

    revalidatePath('/dashboard/users');

    return {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        temporaryPassword: result.temporaryPassword,
      }
    };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof UserAlreadyExistsError || error instanceof UserInputError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
