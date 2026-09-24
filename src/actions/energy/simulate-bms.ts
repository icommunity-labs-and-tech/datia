'use server';

import { requireScope } from '@/lib/auth/tenant';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { recordEvent } from '@/lib/services/events';
import {
  bmsGuaranteeOfOrigin,
  bmsSourceName,
  resolveBmsProfile,
  type BmsProfileId,
} from '@/lib/energy/bmsProfiles';
import { prisma } from '@/lib/prisma';
import { scopeWhere } from '@/lib/scope';

/**
 * The energy source a simulated BMS reports against.
 *
 * The readings themselves and their certification live in
 * `simulate-bms-month.ts`, which meters daily and anchors monthly.
 *
 * Creating the source is idempotent: re-running for the same asset, year and
 * profile lands on the existing one. Without that, each run left another source
 * with the same name, double-counting the energy and filling the map with
 * indistinguishable pins.
 */

export interface BmsSourceResult {
  sourceId: string;
  sourceName: string;
  organizationId: string;
  /** True when an earlier run had already created this source. */
  reused: boolean;
}

export async function createBmsSource(
  assetId: string,
  year: number,
  profileId?: BmsProfileId
): Promise<BmsSourceResult> {
  if (!assetId) throw new Error('Activo requerido');

  const scope = await requireScope();
  const item = await assetRepository.getById(assetId, scope);
  if (!item) throw new Error('Activo no encontrado');

  const profile = resolveBmsProfile(profileId);
  const name = bmsSourceName(profile, year);

  // The asset, year and profile identify the source: a second run must land on
  // the same one rather than add a twin.
  const existing = await prisma.energySource.findFirst({
    where: { assetId, name, Asset: scopeWhere(scope) },
    select: { id: true, name: true },
  });
  if (existing) {
    return { sourceId: existing.id, sourceName: existing.name, organizationId: scope.organizationId, reused: true };
  }

  const service = createEnergyServiceImpl({ energyRepository });

  const source = await service.createSource(scope, {
    name,
    energyCarrier: profile.energyCarrier,
    generationTechnology: profile.generationTechnology,
    capacityKw: profile.capacityKw ?? undefined,
    countryOfOrigin: 'ES',
    renewableShare: profile.renewableShare,
    guaranteeOfOriginId: bmsGuaranteeOfOrigin(profile, assetId, year),
    gridEmissionFactor: profile.emissionFactor,
    assetId,
  });

  await recordEvent(scope, {
    eventType: 'energy_source_event',
    entityType: 'EnergySource',
    entityId: source.id,
    data: {
      sourceId: source.id,
      name: source.name,
      energyCarrier: source.energyCarrier,
      profile: profile.id,
      renewableShare: profile.renewableShare,
      assetId,
    },
  });

  return { sourceId: source.id, sourceName: source.name, organizationId: scope.organizationId, reused: false };
}
