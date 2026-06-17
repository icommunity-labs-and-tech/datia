import { prisma } from '@/lib/prisma';

/** Verifies that an Item belongs to the given org. Returns the item or null. */
export async function validateItemOwnership(itemId: string, organizationId: string) {
  return prisma.item.findFirst({ where: { id: itemId, organizationId }, select: { id: true } });
}

/** Verifies that an EnergySource belongs to the given org (via Item). Returns the source or null. */
export async function validateSourceOwnership(energySourceId: string, organizationId: string) {
  return prisma.energySource.findFirst({
    where: { id: energySourceId, Item: { organizationId } },
    select: { id: true, itemId: true },
  });
}

/** Verifies that an EnergyConsumption belongs to the given org (via Source → Item). Returns the record or null. */
export async function validateConsumptionOwnership(energyConsumptionId: string, organizationId: string) {
  return prisma.energyConsumption.findFirst({
    where: { id: energyConsumptionId, EnergySource: { Item: { organizationId } } },
    select: { id: true, energySourceId: true },
  });
}
