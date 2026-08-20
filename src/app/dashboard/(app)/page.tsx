import { cookies } from 'next/headers';
import DashboardMantine from '../DashboardMantine';
import { getDashboardKPIs, getEnergySummary } from '@/actions/dashboard';
import { listEnergySources } from '@/actions/energy/list-sources';
import { getItems } from '@/actions/items';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Mirrors the shell: the home page must not surface a module the nav hides. */
async function isEnergyEnabled(): Promise<boolean> {
  const token = (await cookies()).get(adminAuthConfig.cookieName)?.value;
  if (!token) return false;
  const payload = await verifyAdminJWT(token);
  if (!payload?.organizationId) return false;

  const org = await prisma.organization.findUnique({
    where: { id: payload.organizationId },
    select: { configuracion: true },
  });
  const cfg = org?.configuracion as { modules?: { energy?: boolean } } | null;
  return cfg?.modules?.energy === true;
}

export default async function DashboardIndexPage() {
  const [kpis, energySummary, sourcesResult, energyEnabled, items] = await Promise.all([
    getDashboardKPIs(),
    getEnergySummary(),
    listEnergySources(),
    isEnergyEnabled(),
    getItems().catch(() => []),
  ]);

  const recentItems = items.slice(0, 5).map((item) => ({
    id: item.id,
    name: item.name,
    categoryName: item.categories?.[0]?.name ?? null,
    certified: item.states?.[0]?.backed ?? false,
  }));

  return (
    <DashboardMantine
      kpis={kpis}
      energySummary={energySummary}
      energySources={sourcesResult ?? []}
      energyEnabled={energyEnabled}
      recentItems={recentItems}
    />
  );
}
