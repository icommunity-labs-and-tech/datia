'use server';

import { prisma } from '@/lib/prisma';
import { requireOrganizationAccount } from './access';
import type { Scope } from '@/lib/scope';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { forecastEnergy, type EnergyForecast, type ForecastHorizon } from '@/lib/projections/energy-forecast';
import { computeConsumptionHeatmap, computeEmissionsHeatmap, type Heatmap } from '@/lib/energy/heatmap';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  EnergyConsumptionTotals,
  EmissionTotals,
} from '@/domain/energy/EnergyTypes';

export interface CompanyEnergy {
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
 * The scope of one company, as seen from the organization's own panel (#20):
 * the company comes from the address, not from any session default, and is
 * checked to belong to this organization before becoming anyone's scope.
 * Throws rather than returning null, so a caller mid-interaction (the
 * forecast horizon selector) fails loudly instead of silently.
 */
async function requireCompanyScope(companyId: string): Promise<Scope> {
  const { organizationId } = await requireOrganizationAccount();
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId }, select: { id: true } });
  if (!company) throw new Error('Empresa no encontrada');
  return { organizationId, companyId };
}

/** What one company holds about its own energy and carbon, read-only (#20) — the same views the company itself has, scoped to it alone. */
export async function getCompanyEnergy(companyId: string): Promise<CompanyEnergy | null> {
  let scope: Scope;
  try {
    scope = await requireCompanyScope(companyId);
  } catch {
    return null;
  }

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

/**
 * The forecast alone, for the horizon selector inside the organization's
 * read-only view of one company (#20). `companyId` is fixed by the page that
 * calls this, not resolved from the caller's own session — unlike the
 * dashboard's own `getEnergyForecast`, which only ever means "my scope".
 */
export async function getCompanyEnergyForecast(companyId: string, horizon: ForecastHorizon): Promise<EnergyForecast> {
  const scope = await requireCompanyScope(companyId);
  return forecastEnergy(scope, horizon);
}
