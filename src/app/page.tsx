'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la página de selección de aplicaciones
    router.push('/apps');
  }, [router]);

  // Mostrar loading mientras se determina la redirección
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Redirigiendo...</span>
        </div>
        <p className="mt-3 text-muted">Redirigiendo...</p>
      </div>
    </div>
  );
}
