'use client';

import { useCallback } from 'react';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';

export default function LogoutButton() {
  const { logout } = useAuthSeparated();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Error al cerrar sesión', err);
      // Fallback: limpiar cookies manualmente y redirigir
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      // Detectar contexto para redirección correcta
      const pathname = window.location.pathname;
      if (pathname.startsWith('/dashboard')) {
        window.location.replace('/auth/admin/login');
      } else if (pathname.startsWith('/operator')) {
        window.location.replace('/auth/operator/login');
      } else {
        window.location.replace('/apps');
      }
    }
  }, [logout]);

  return (
    <button
      onClick={handleLogout}
      className="text-dark bg-transparent border-0 p-0"
      title="Cerrar sesión"
    >
      <i className="bi bi-box-arrow-right fs-5" />
    </button>
  );
}
