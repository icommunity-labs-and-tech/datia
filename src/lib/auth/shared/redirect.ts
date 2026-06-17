import { NextRequest } from 'next/server';
import { verifyAdminJWT } from '../admin/jwt';
import { verifyOperatorJWT } from '../operator/jwt';
import { adminAuthConfig } from '../admin/config';
import { operatorAuthConfig } from '../operator/config';

export interface UserContext {
  type: 'admin' | 'operator' | 'none';
  user?: any;
  loginUrl: string;
  redirectUrl: string;
}

/**
 * Detecta automáticamente el contexto del usuario basado en las cookies
 */
export async function detectUserContext(request: NextRequest): Promise<UserContext> {
  // Verificar cookie de admin primero
  const adminToken = request.cookies.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const adminUser = await verifyAdminJWT(adminToken);
    if (adminUser && adminUser.role === 'ADMIN') {
      return {
        type: 'admin',
        user: adminUser,
        loginUrl: '/auth/admin/login',
        redirectUrl: '/dashboard'
      };
    }
  }

  // Verificar cookie de operator
  const operatorToken = request.cookies.get(operatorAuthConfig.cookieName)?.value;
  if (operatorToken) {
    const operatorUser = await verifyOperatorJWT(operatorToken);
    if (operatorUser && operatorUser.role === 'USER') {
      return {
        type: 'operator',
        user: operatorUser,
        loginUrl: '/auth/operator/login',
        redirectUrl: '/operator'
      };
    }
  }

  // No hay usuario autenticado
  return {
    type: 'none',
    loginUrl: '/auth/admin/login', // Default to admin login
    redirectUrl: '/dashboard'
  };
}

/**
 * Obtiene la URL de login apropiada basada en el path
 */
export function getLoginUrlForPath(pathname: string): string {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return '/auth/admin/login';
  }
  
  if (pathname.startsWith('/operator')) {
    return '/auth/operator/login';
  }
  
  // Default to admin login
  return '/auth/admin/login';
}

/**
 * Obtiene la URL de redirección apropiada basada en el rol
 */
export function getRedirectUrlForRole(role: string): string {
  if (role === 'ADMIN') {
    return '/dashboard';
  }
  
  if (role === 'USER') {
    return '/operator';
  }
  
  // Default to admin login
  return '/auth/admin/login';
}
