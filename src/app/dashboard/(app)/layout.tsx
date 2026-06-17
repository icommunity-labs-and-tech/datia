import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';
import AppShell from './AppShell';

export type OrgModules = {
  passport?: boolean;
  energy?: boolean;
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;
  let logoUrl: string | null = null;
  let brandColorPrimary: string | null = null;
  let brandColorSecondary: string | null = null;
  let modules: OrgModules = { passport: true, energy: false };

  if (token) {
    const payload = await verifyAdminJWT(token);
    if (payload?.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: payload.organizationId },
        select: { logoUrl: true, brandColorPrimary: true, brandColorSecondary: true, configuracion: true },
      });
      logoUrl = org?.logoUrl ?? null;
      brandColorPrimary = org?.brandColorPrimary ?? null;
      brandColorSecondary = org?.brandColorSecondary ?? null;
      if (org?.configuracion && typeof org.configuracion === 'object') {
        const cfg = org.configuracion as Record<string, unknown>;
        if (cfg.modules && typeof cfg.modules === 'object') {
          modules = { ...modules, ...(cfg.modules as OrgModules) };
        }
      }
    }
  }

  return (
    <AppShell
      logoUrl={logoUrl}
      brandColorPrimary={brandColorPrimary}
      brandColorSecondary={brandColorSecondary}
      modules={modules}
    >
      {children}
    </AppShell>
  );
}
