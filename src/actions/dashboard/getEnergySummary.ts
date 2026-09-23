'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { prisma } from '@/lib/prisma';

export interface EnergySummary {
  totalSources: number;
  sourcesWithCoords: number;
  kwhThisMonth: number;
  co2eKgThisMonth: number;
  avgRenewableShare: number | null;
}

export async function getEnergySummary(): Promise<EnergySummary> {
  const organizationId = await requireOrganizationId();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sources, consumptionAgg, emissionsAgg] = await Promise.all([
    prisma.energySource.findMany({
      where: { Asset: { organizationId } },
      select: { id: true, renewableShare: true, latitude: true, longitude: true },
    }),
    prisma.energyConsumption.aggregate({
      where: {
        EnergySource: { Asset: { organizationId } },
        periodStart: { gte: monthStart },
      },
      _sum: { consumptionKwh: true },
    }),
    prisma.emissionRecord.aggregate({
      where: {
        EnergyConsumption: { EnergySource: { Asset: { organizationId } } },
        createdAt: { gte: monthStart },
      },
      _sum: { co2eKg: true },
    }),
  ]);

  const renewableSources = sources.filter((s) => s.renewableShare != null);
  const avgRenewable =
    renewableSources.length > 0
      ? renewableSources.reduce((sum, s) => sum + s.renewableShare!, 0) / renewableSources.length
      : null;

  return {
    totalSources: sources.length,
    sourcesWithCoords: sources.filter((s) => s.latitude != null && s.longitude != null).length,
    kwhThisMonth: consumptionAgg._sum.consumptionKwh ?? 0,
    co2eKgThisMonth: emissionsAgg._sum.co2eKg ?? 0,
    avgRenewableShare: avgRenewable != null ? Math.round(avgRenewable * 10) / 10 : null,
  };
}
