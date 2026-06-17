import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { redirect } from 'next/navigation';
import UsersPageClient from './UsersPageClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;
  
  if (!token) {
    redirect('/auth/admin/login');
  }

  const payload = await verifyAdminJWT(token);
  
  if (!payload?.id) {
    redirect('/auth/admin/login');
  }

  // Verificar que es admin
  if (payload.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!user) {
    redirect('/auth/admin/login');
  }

  return <UsersPageClient />;
}
