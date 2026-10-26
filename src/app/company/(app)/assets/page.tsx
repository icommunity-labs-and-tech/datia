import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';
import { listEnergySources } from '@/actions/energy/list-sources';
import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import { getConsumptionBreakdown } from '@/actions/energy/get-breakdown';
import AssetsGallery from './AssetsGallery';

export const dynamic = 'force-dynamic';

/**
 * Assets and their energy sources, on one page.
 *
 * They used to be two: a catalogue and a map of sources. Both plotted the same
 * sites — every source belongs to an asset, so a source is not a parallel thing
 * but the energy side of one — and the two maps ended up showing the same five
 * points twice. Here the installation is the spine, and an asset's energy is one
 * more thing you find inside it.
 */
/**
 * The organization's energy switch no longer gates any energy data — every
 * company sees its own. What it still turns on is the BMS simulator, a demo
 * tool that writes a year of synthetic readings.
 */
async function simulatorEnabled(): Promise<boolean> {
  try {
    const token = (await cookies()).get(adminAuthConfig.cookieName)?.value;
    if (!token) return false;
    const payload = await verifyAdminJWT(token);
    if (!payload?.organizationId) return false;

    const org = await prisma.organization.findUnique({
      where: { id: payload.organizationId },
      select: { settings: true },
    });
    const cfg = (org?.settings ?? {}) as Record<string, unknown>;
    const modules = (cfg.modules ?? {}) as Record<string, unknown>;
    return modules.energy === true;
  } catch {
    return false;
  }
}

export default async function ItemsPage() {
  const [simulator, sources, consumption, breakdown] = await Promise.all([
    simulatorEnabled(),
    listEnergySources(),
    listEnergyConsumption(),
    getConsumptionBreakdown(),
  ]);

  return (
    <AssetsGallery
      simulator={simulator}
      energyByAsset={breakdown.perAsset}
      sources={sources ?? []}
      consumption={consumption ?? []}
    />
  );
}
