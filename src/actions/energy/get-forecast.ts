'use server';

import { requireScope } from '@/lib/auth/tenant';
import { forecastEnergy, type EnergyForecast, type ForecastHorizon } from '@/lib/projections/energy-forecast';

const HORIZONS: readonly ForecastHorizon[] = [3, 6, 12];

/**
 * The dashboard's own consumption and emissions projection (#21), for the
 * account's scope — one company, or every company of an organisation account.
 */
export async function getEnergyForecast(horizonMonths: ForecastHorizon): Promise<EnergyForecast> {
  if (!HORIZONS.includes(horizonMonths)) {
    throw new Error(`Horizonte de proyección no válido: ${horizonMonths}`);
  }
  const scope = await requireScope();
  return forecastEnergy(scope, horizonMonths);
}
