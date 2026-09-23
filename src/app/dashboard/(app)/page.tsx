import { cookies } from 'next/headers';
import DashboardMantine from '../DashboardMantine';
import { getDashboardKPIs, getEnergySummary, getCertificationTrend } from '@/actions/dashboard';
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
    select: { settings: true },
  });
  const cfg = org?.settings as { modules?: { energy?: boolean } } | null;
  return cfg?.modules?.energy === true;
}

export default async function DashboardIndexPage() {
  const [kpis, energySummary, energyEnabled, items, trend] = await Promise.all([
    getDashboardKPIs(),
    getEnergySummary(),
    isEnergyEnabled(),
    getItems().catch(() => []),
    // The series the page is built around; an organisation without the module
    // simply has none, and the layout falls back to the catalogue.
    getCertificationTrend().catch(() => undefined),
  ]);

  const recentItems = items.slice(0, 5).map((item) => ({
    id: item.id,
    name: item.name,
    certified: item.certified,
  }));

  return (
    <DashboardMantine
      kpis={kpis}
      trend={trend}
      energySummary={energySummary}
      energyEnabled={energyEnabled}
      recentItems={recentItems}
    />
  );
}
