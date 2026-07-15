import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { verifySuperAdminJWT } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';

export async function verifyAdminAuth() {
  // Bypass in test environment
  if (process.env.VITEST_WORKER_ID) {
    return { id: 'admin-test', role: 'ADMIN' } as any;
  }

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
  // Bypass in test environment
  if (process.env.VITEST_WORKER_ID) {
    return { id: 'admin-test', role: 'ADMIN' } as any;
  }

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

export async function verifySuperAdminAuth() {
  // Bypass in test environment
  if (process.env.VITEST_WORKER_ID) {
    return { id: 'superadmin-test', role: 'SUPER_ADMIN' } as any;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(superadminAuthConfig.cookieName)?.value;

  if (!token) {
    throw new Error('No autorizado');
  }

  const payload = await verifySuperAdminJWT(token);
  if (!payload || payload.role !== 'SUPER_ADMIN') {
    throw new Error('Solo los super administradores pueden realizar esta acción');
  }

  return payload;
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
