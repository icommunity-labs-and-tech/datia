import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

/** Verifies that an Asset is inside the given scope. Returns the asset or null. */
export async function validateItemOwnership(assetId: string, scope: Scope) {
  return prisma.asset.findFirst({ where: { id: assetId, ...scopeWhere(scope) }, select: { id: true } });
}

/** Verifies that an EnergySource is inside the given scope (via Asset). Returns the source or null. */
export async function validateSourceOwnership(energySourceId: string, scope: Scope) {
  return prisma.energySource.findFirst({
    where: { id: energySourceId, Asset: scopeWhere(scope) },
    select: { id: true, assetId: true },
  });
}

/** Verifies that an EnergyConsumption is inside the given scope (via Source → Asset). Returns the record or null. */
export async function validateConsumptionOwnership(energyConsumptionId: string, scope: Scope) {
  return prisma.energyConsumption.findFirst({
    where: { id: energyConsumptionId, EnergySource: { Asset: scopeWhere(scope) } },
    select: { id: true, energySourceId: true },
  });
}
