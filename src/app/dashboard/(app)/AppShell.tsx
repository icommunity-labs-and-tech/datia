'use client';

import { AuthProvider } from '@/hooks/useAuthSeparated';
import DatiaAppShell from '@/components/layout/MantineAppShell';
import type { OrgModules } from './layout';

interface AppShellProps {
  children: React.ReactNode;
  logoUrl?: string | null;
  brandColorPrimary?: string | null;
  brandColorSecondary?: string | null;
  modules?: OrgModules;
}

export default function AppShell({ children, logoUrl, brandColorPrimary, brandColorSecondary, modules }: AppShellProps) {
  return (
    <AuthProvider>
      <DatiaAppShell
        logoUrl={logoUrl}
        brandColorPrimary={brandColorPrimary}
        brandColorSecondary={brandColorSecondary}
        modules={modules}
      >
        {children}
      </DatiaAppShell>
    </AuthProvider>
  );
}
