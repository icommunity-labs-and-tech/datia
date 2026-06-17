'use client';

import { useRouter } from 'next/navigation';

export function useAdminOperatorAccess() {
  const router = useRouter();

  const clearAdminOperatorAccess = () => {
    // Limpiar la cookie de acceso de admin a operador
    document.cookie = 'admin-operator-access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    // Redirigir al dashboard
    router.push('/dashboard');
  };

  return {
    clearAdminOperatorAccess
  };
}
