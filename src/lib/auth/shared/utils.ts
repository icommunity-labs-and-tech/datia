import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { JWTPayload } from './types';

/**
 * Autentica un usuario verificando email y contraseña
 * Función compartida entre admin y operator
 */
export async function authenticateUser(email: string, password: string): Promise<JWTPayload | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        organizationId: true, // Incluir organizationId
        companyId: true,
        status: true, // Verificar si está activo
      }
    });

    if (!user) {
      return null;
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'ACTIVE') {
      return null;
    }

    // Verificar que tenga password (usuarios pendientes no tienen)
    if (!user.password) {
      return null;
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId, // Incluir en el payload
      companyId: user.companyId,
      context: 'admin', // Se sobrescribirá según el contexto
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Valida que el usuario tenga el rol correcto para el contexto admin
 */
export function validateUserRole(user: JWTPayload, context: 'admin'): boolean {
  if (context === 'admin') {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }
  return false;
}

/**
 * Genera un error de autenticación estandarizado
 */
export function createAuthError(message: string, status: number = 401) {
  return {
    success: false,
    error: message,
    status
  };
}
