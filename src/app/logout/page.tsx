'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      try {
        // Detectar contexto basado en referrer o cookies
        const referrer = document.referrer;
        let context = 'admin'; // default
        
        if (referrer.includes('/operator')) {
          context = 'operator';
        } else if (referrer.includes('/dashboard')) {
          context = 'admin';
        }
        
        // Llamar a la API de logout correcta
        await fetch(`/api/auth/${context}/logout`, { 
          method: 'POST',
          credentials: 'include'
        });
        
        // Redirigir al login correcto
        router.push(`/auth/${context}/login`);
      } catch (error) {
        console.error('Error al hacer logout:', error);
        // Redirigir a la página de selección como fallback
        router.push('/apps');
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
