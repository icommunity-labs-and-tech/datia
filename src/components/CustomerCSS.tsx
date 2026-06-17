'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomerCSS() {
  const pathname = usePathname();
  const isCustomerRoute = pathname?.startsWith('/customer') || pathname?.startsWith('/checker');

  useEffect(() => {
    if (isCustomerRoute) {
      // Cargar CSS solo para rutas de customer
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/customer.css';
      link.id = 'customer-css';
      
      // Remover CSS anterior si existe
      const existingLink = document.getElementById('customer-css');
      if (existingLink) {
        existingLink.remove();
      }
      
      document.head.appendChild(link);
      
      // Cleanup al desmontar
      return () => {
        const linkToRemove = document.getElementById('customer-css');
        if (linkToRemove) {
          linkToRemove.remove();
        }
      };
    } else {
      // Remover CSS si no estamos en customer
      const linkToRemove = document.getElementById('customer-css');
      if (linkToRemove) {
        linkToRemove.remove();
      }
    }
  }, [isCustomerRoute]);

  return null;
}
