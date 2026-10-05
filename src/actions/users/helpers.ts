import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { isDashboardRole } from '@/lib/auth/roles';

export async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

  if (!token) {
    throw new Error('No autorizado');
  }

  const payload = await verifyAdminJWT(token);
  if (!payload || !isDashboardRole(payload.role)) {
    throw new Error('Solo los administradores pueden realizar esta acción');
  }

  return payload;
}

export async function verifyUserAuth() {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const payload = await verifyAdminJWT(adminToken);
    if (payload && (isDashboardRole(payload.role) || payload.role === 'SUPER_ADMIN')) {
      return payload;
    }
  }

  throw new Error('No autorizado');
}
