'use client';

import { useCallback, useState, useTransition } from 'react';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import type { EnergyForecast, ForecastHorizon } from '@/lib/projections/energy-forecast';

/**
 * Drives the horizon selector on the consumption and emissions views (#21):
 * starts from what the page already fetched server-side, and re-fetches only
 * when the reader picks a different horizon.
 */
export function useEnergyForecast(initial: EnergyForecast) {
  const [forecast, setForecast] = useState(initial);
  const [horizon, setHorizonState] = useState<ForecastHorizon>(initial.horizonMonths);
  const [isPending, startTransition] = useTransition();

  const setHorizon = useCallback((next: ForecastHorizon) => {
    setHorizonState(next);
    startTransition(async () => {
      const result = await getEnergyForecast(next);
      setForecast(result);
    });
  }, []);

  return { forecast, horizon, setHorizon, isPending };
}
