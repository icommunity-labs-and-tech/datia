import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';

export async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

  if (!token) {
    throw new Error('No autorizado');
  }

  const payload = await verifyAdminJWT(token);
  if (!payload || payload.role !== 'ADMIN') {
    throw new Error('Solo los administradores pueden realizar esta acción');
  }

  return payload;
}

export async function verifyUserAuth() {
  const cookieStore = await cookies();

  const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
  if (adminToken) {
    const payload = await verifyAdminJWT(adminToken);
    if (payload && (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN')) {
      return payload;
    }
  }

  throw new Error('No autorizado');
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join('');
}
