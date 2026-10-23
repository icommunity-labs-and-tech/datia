'use server';

import { prisma } from '@/lib/prisma';
import { scopeWhere } from '@/lib/scope';
import { requireScope } from '@/lib/auth/tenant';
import { nearestMunicipality } from '@/lib/map/municipality';
import { consumptionBreakdown, emissionBreakdown } from '@/lib/energy/breakdown';

/** Consumption across every asset in scope, broken down by asset, place and carrier. */
export async function getConsumptionBreakdown() {
  const scope = await requireScope();
  const rows = await prisma.energyConsumption.findMany({
    where: { EnergySource: { Asset: scopeWhere(scope) } },
    select: {
      id: true,
      periodStart: true,
      consumptionKwh: true,
      lifecycleStage: true,
      EnergySource: {
        select: {
          id: true,
          name: true,
          energyCarrier: true,
          renewableShare: true,
          Asset: { select: { id: true, name: true, latitude: true, longitude: true } },
        },
      },
    },
  });

  return consumptionBreakdown(
    rows.map((r) => ({
      id: r.id,
      periodStart: r.periodStart,
      consumptionKwh: r.consumptionKwh,
      lifecycleStage: r.lifecycleStage,
      source: {
        id: r.EnergySource.id,
        name: r.EnergySource.name,
        energyCarrier: r.EnergySource.energyCarrier,
        renewableShare: r.EnergySource.renewableShare,
      },
      asset: r.EnergySource.Asset,
    })),
    nearestMunicipality
  );
}

/** Emissions across every asset in scope, broken down by asset, scope and verification. */
export async function getEmissionBreakdown() {
  const scope = await requireScope();
  const rows = await prisma.emissionRecord.findMany({
    where: { EnergyConsumption: { EnergySource: { Asset: scopeWhere(scope) } } },
    select: {
      id: true,
      co2eKg: true,
      scope: true,
      verificationStatus: true,
      emissionFactor: true,
      EnergyConsumption: {
        select: {
          id: true,
          periodStart: true,
          consumptionKwh: true,
          EnergySource: { select: { name: true, Asset: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return emissionBreakdown(
    rows.map((r) => ({
      id: r.id,
      co2eKg: r.co2eKg,
      scope: r.scope,
      verificationStatus: r.verificationStatus,
      emissionFactor: r.emissionFactor,
      consumption: {
        id: r.EnergyConsumption.id,
        periodStart: r.EnergyConsumption.periodStart,
        consumptionKwh: r.EnergyConsumption.consumptionKwh,
      },
      source: { name: r.EnergyConsumption.EnergySource.name },
      asset: r.EnergyConsumption.EnergySource.Asset,
    }))
  );
}
