import type { Metadata } from 'next';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { appConfig } from '@/config/app';
import { isDashboardRole } from '@/lib/auth/roles';

export const metadata: Metadata = {
  title: `Dashboard - ${appConfig.name}`,
  description: `Panel de empresa de ${appConfig.name}`,
};

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

  // Verificar autenticación
  if (!token) {
    redirect('/auth/company/login?error=Unauthorized');
  }

  const user = await verifyAdminJWT(token);
  
  if (!user) {
    redirect('/auth/company/login?error=Unauthorized');
  }

  // Verificar que sea admin (solo admins pueden acceder al dashboard)
  if (!isDashboardRole(user.role)) {
    redirect('/auth/company/login?error=AccessDenied');
  }

  return <>{children}</>;
}
