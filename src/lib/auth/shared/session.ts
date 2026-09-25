import { cookies } from 'next/headers';
import { verifyAdminJWT } from '../admin/jwt';
import { adminAuthConfig } from '../admin/config';
import { isDashboardRole } from '@/lib/auth/roles';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  context: 'admin';
}

export async function getCurrentUserSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();

    const adminToken = cookieStore.get(adminAuthConfig.cookieName)?.value;
    if (adminToken) {
      const adminUser = await verifyAdminJWT(adminToken);
      if (adminUser && isDashboardRole(adminUser.role)) {
        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          context: 'admin'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

export async function getCurrentUserWithDetails(): Promise<UserSession | null> {
  try {
    const session = await getCurrentUserSession();
    if (!session) return null;

    const { prisma } = await import('@/lib/prisma');

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) return null;

    return { ...session };
  } catch (error) {
    console.error('Error getting user with details:', error);
    return null;
  }
}
