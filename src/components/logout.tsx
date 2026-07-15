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
      window.location.replace('/auth/admin/login');
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
