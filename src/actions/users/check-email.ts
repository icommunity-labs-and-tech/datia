'use server';

import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

/**
 * Verifica si un email ya está registrado en el sistema
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
  // Solo para el alta de usuarios en el dashboard; sin sesión serviría para
  // averiguar qué emails tienen cuenta.
  await requireOrganizationId();

  if (!email || typeof email !== 'string' || email.trim() === '') {
    return { exists: false, error: 'Email inválido' };
  }

  // Normalizar el email (trim y lowercase)
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Intentar obtener el usuario por email
    await userRepository.getByEmail(normalizedEmail);
    return { exists: true };
  } catch {
    return { exists: false };
  }
}

