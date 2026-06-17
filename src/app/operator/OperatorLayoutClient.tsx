'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface OperatorLayoutClientProps {
  user: JWTPayload;
  children: React.ReactNode;
}

export default function OperatorLayoutClient({ user, children }: OperatorLayoutClientProps) {
  const t = useTranslations('operator');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      // Verificar si el admin tiene el parámetro admin-access=true
      const adminAccess = searchParams.get('admin-access');
      
      if (adminAccess === 'true') {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Si no tiene el parámetro, verificar si tiene la cookie
      const cookies = document.cookie.split(';');
      const adminCookie = cookies.find(cookie => 
        cookie.trim().startsWith('admin-operator-access=')
      );
      
      if (adminCookie && adminCookie.split('=')[1] === 'true') {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Si no tiene ni el parámetro ni la cookie, redirigir al dashboard
      console.log('❌ OperatorLayoutClient: No access found, redirecting to dashboard');
      router.push('/dashboard');
    };

    checkAccess();
  }, [searchParams, router]);

  // Mostrar loading mientras se verifica
  if (isChecking) {
    return (
      <div className="operator-layout d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('verifyingAccess')}</span>
        </div>
      </div>
    );
  }

  // Si tiene acceso, mostrar la aplicación del operador
  if (hasAccess) {
    return (
      <div className="operator-layout">
        {children}
      </div>
    );
  }

  // Si no tiene acceso, no mostrar nada (la redirección ya se hizo)
  return null;
}
