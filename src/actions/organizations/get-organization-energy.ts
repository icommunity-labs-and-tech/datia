'use server';

import { requireOrganizationAccount } from '@/actions/companies/access';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { forecastEnergy, type EnergyForecast, type ForecastHorizon } from '@/lib/projections/energy-forecast';
import { computeConsumptionHeatmap, computeEmissionsHeatmap, type Heatmap } from '@/lib/energy/heatmap';
import type { Scope } from '@/lib/scope';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  EnergyConsumptionTotals,
  EmissionTotals,
} from '@/domain/energy/EnergyTypes';

export interface OrganizationEnergy {
  sources: EnergySourceRecord[];
  consumption: EnergyConsumptionRecord[];
  consumptionTotals: EnergyConsumptionTotals;
  emissions: EmissionRecord[];
  emissionTotals: EmissionTotals;
  forecast: EnergyForecast;
  consumptionHeatmap: Heatmap;
  emissionsHeatmap: Heatmap;
}

/**
 * What the organization account's own Consumo/Emisiones pages show: the same
 * views a company has, summed across every company it operates — the same
 * `EnergyService` calls a company dashboard makes, with a scope that has no
 * `companyId` (#20).
 */
export async function getOrganizationEnergy(): Promise<OrganizationEnergy> {
  const { organizationId } = await requireOrganizationAccount();
  const scope: Scope = { organizationId, companyId: null };

  const service = createEnergyServiceImpl({ energyRepository });
  const [sourcesResult, consumptionResult, consumptionTotals, emissionsResult, emissionTotals, forecast, consumptionHeatmap, emissionsHeatmap] =
    await Promise.all([
      service.listSources(scope),
      service.listConsumption(scope),
      service.getConsumptionTotals(scope),
      service.listEmissions(scope),
      service.getEmissionTotals(scope),
      forecastEnergy(scope, 6),
      computeConsumptionHeatmap(scope),
      computeEmissionsHeatmap(scope),
    ]);

  return {
    sources: sourcesResult.data,
    consumption: consumptionResult.data,
    consumptionTotals,
    emissions: emissionsResult.data,
    emissionTotals,
    forecast,
    consumptionHeatmap,
    emissionsHeatmap,
  };
}

/** The forecast alone, for the horizon selector — summed across every company, same as the rest of this view. */
export async function getOrganizationEnergyForecast(horizon: ForecastHorizon): Promise<EnergyForecast> {
  const { organizationId } = await requireOrganizationAccount();
  return forecastEnergy({ organizationId, companyId: null }, horizon);
}
