'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      try {
        await fetch('/api/auth/company/logout', { method: 'POST', credentials: 'include' });
        router.push('/auth/company/login');
      } catch {
        router.push('/auth/company/login');
      }
    }

    logout();
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Cerrando sesión...</h2>
      <p>Serás redirigido al login en unos segundos.</p>
    </div>
  );
}
