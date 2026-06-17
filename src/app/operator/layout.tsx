import type { Metadata } from 'next';
import { verifyOperatorJWT } from '@/lib/auth/operator/jwt';
import { operatorAuthConfig } from '@/lib/auth/operator/config';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import OperatorLayoutClient from './OperatorLayoutClient';
import { AuthProvider } from '@/hooks/useAuthSeparated';
import { appConfig } from '@/config/app';

export const metadata: Metadata = {
  title: `App Operario - ${appConfig.name}`,
  description: `Aplicación móvil para operarios de ${appConfig.name}`,
};

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(operatorAuthConfig.cookieName)?.value;

  // Verificar autenticación
  if (!token) {
    redirect('/auth/operator/login?error=Unauthorized');
  }

  try {
    const user = await verifyOperatorJWT(token);
    
    if (!user) {
      redirect('/auth/operator/login?error=Unauthorized');
    }

    // Para operadores (rol USER), permitir acceso directamente
    if (user.role === 'USER') {
      return (
        <AuthProvider>
          <div className="operator-layout">
            {children}
          </div>
        </AuthProvider>
      );
    }

    // Para admins, usar el componente cliente que maneja el parámetro admin-access
    return (
      <AuthProvider>
        <OperatorLayoutClient user={user}>
          {children}
        </OperatorLayoutClient>
      </AuthProvider>
    );
  } catch (error) {
    console.error('Error in operator layout:', error);
    redirect('/auth/operator/login?error=Unauthorized');
  }
}
