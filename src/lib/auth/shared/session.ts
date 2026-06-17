import { cookies } from 'next/headers';
import { verifyAdminJWT } from '../admin/jwt';
import { verifyOperatorJWT } from '../operator/jwt';
import { adminAuthConfig } from '../admin/config';
import { operatorAuthConfig } from '../operator/config';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  context: 'admin' | 'operator';
}

/**
 * Obtiene la sesión del usuario desde cualquier contexto (admin u operator)
 * Útil para servicios que necesitan identificar al usuario sin importar el contexto
 */
export async function getCurrentUserSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    
    // Intentar obtener sesión de admin primero
    const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
    if (adminToken) {
      const adminUser = await verifyAdminJWT(adminToken);
      if (adminUser && adminUser.role === 'ADMIN') {
        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          context: 'admin'
        };
      }
    }

    // Intentar obtener sesión de operator
    const operatorToken = cookieStore.get(operatorAuthConfig.cookieName)?.value;
    if (operatorToken) {
      const operatorUser = await verifyOperatorJWT(operatorToken);
      if (operatorUser && operatorUser.role === 'USER') {
        return {
          id: operatorUser.id,
          email: operatorUser.email,
          name: operatorUser.name,
          role: operatorUser.role,
          context: 'operator'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

/**
 * Obtiene información adicional del usuario desde la base de datos
 */
export async function getCurrentUserWithDetails(): Promise<UserSession | null> {
  try {
    const session = await getCurrentUserSession();
    if (!session) return null;

    // Importar prisma aquí para evitar problemas de circular imports
    const { prisma } = await import('@/lib/prisma');
    
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    if (!user) return null;

    return {
      ...session,
    };
  } catch (error) {
    console.error('Error getting user with details:', error);
    return null;
  }
}
