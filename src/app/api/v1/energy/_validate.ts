import { prisma } from '@/lib/prisma';

/** Verifies that an Item belongs to the given org. Returns the item or null. */
export async function validateItemOwnership(assetId: string, organizationId: string) {
  return prisma.asset.findFirst({ where: { id: assetId, organizationId }, select: { id: true } });
}

/** Verifies that an EnergySource belongs to the given org (via Item). Returns the source or null. */
export async function validateSourceOwnership(energySourceId: string, organizationId: string) {
  return prisma.energySource.findFirst({
    where: { id: energySourceId, Asset: { organizationId } },
    select: { id: true, assetId: true },
  });
}

/** Verifies that an EnergyConsumption belongs to the given org (via Source → Item). Returns the record or null. */
export async function validateConsumptionOwnership(energyConsumptionId: string, organizationId: string) {
  return prisma.energyConsumption.findFirst({
    where: { id: energyConsumptionId, EnergySource: { Asset: { organizationId } } },
    select: { id: true, energySourceId: true },
  });
}
