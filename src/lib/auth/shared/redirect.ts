import { NextRequest } from 'next/server';
import { verifyAdminJWT } from '../admin/jwt';
import { adminAuthConfig } from '../admin/config';

export interface UserContext {
  type: 'admin' | 'none';
  user?: any;
  loginUrl: string;
  redirectUrl: string;
}

export async function detectUserContext(request: NextRequest): Promise<UserContext> {
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

  return {
    type: 'none',
    loginUrl: '/auth/admin/login',
    redirectUrl: '/dashboard'
  };
}

export function getLoginUrlForPath(pathname: string): string {
  return '/auth/admin/login';
}

export function getRedirectUrlForRole(role: string): string {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return '/dashboard';
  }
  return '/auth/admin/login';
}
