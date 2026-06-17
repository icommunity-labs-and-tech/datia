'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

type RootContainerProps = {
  children: React.ReactNode;
};

export default function RootContainer({ children }: RootContainerProps) {
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith('/dashboard');
  const isOrgLogin = pathname?.startsWith('/org/');
  const isAuthLogin = pathname?.startsWith('/auth/');

  if (isDashboard || isOrgLogin || isAuthLogin) {
    return <>{children}</>;
  }

  return <div className="root-container">{children}</div>;
}


