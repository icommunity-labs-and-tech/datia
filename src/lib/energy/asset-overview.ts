import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

export interface AssetSourceConsumption {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  consumptionKwh: number;
  lifecycleStage: string;
  emission: { id: string; co2eKg: number; verificationStatus: string; certificationId: string | null } | null;
}

export interface AssetEnergySourceOverview {
  id: string;
  name: string;
  energyCarrier: string;
  generationTechnology: string | null;
  renewableShare: number | null;
  consumption: AssetSourceConsumption[];
}

/**
 * The energy chain behind one asset, grouped by source so each consumption
 * stays next to the emission it produced — flat, disconnected lists are how
 * the per-asset certifications bug happened in the first place.
 */
export async function assetEnergyOverview(scope: Scope, assetId: string): Promise<AssetEnergySourceOverview[]> {
  const sources = await prisma.energySource.findMany({
    where: { assetId, Asset: scopeWhere(scope) },
    orderBy: { createdAt: 'desc' },
    include: {
      EnergyConsumption: {
        orderBy: { periodStart: 'desc' },
        include: { EmissionRecord: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    energyCarrier: s.energyCarrier,
    generationTechnology: s.generationTechnology,
    renewableShare: s.renewableShare,
    consumption: s.EnergyConsumption.map((c) => {
      const emission = c.EmissionRecord[0];
      return {
        id: c.id,
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        consumptionKwh: c.consumptionKwh,
        lifecycleStage: c.lifecycleStage,
        emission: emission
          ? {
              id: emission.id,
              co2eKg: emission.co2eKg,
              verificationStatus: emission.verificationStatus,
              certificationId: emission.certificationId,
            }
          : null,
      };
    }),
  }));
}
