'use client';

import { useCallback, useState, useTransition } from 'react';
import { getEnergyForecast } from '@/actions/energy/get-forecast';
import type { EnergyForecast, ForecastHorizon } from '@/lib/projections/energy-forecast';

/**
 * Drives the horizon selector on the consumption and emissions views (#21):
 * starts from what the page already fetched server-side, and re-fetches only
 * when the reader picks a different horizon.
 *
 * `fetchForecast` defaults to the account's own scope. The organization panel
 * reads one of its companies instead — a fixed id from the address, not the
 * caller's own session — so it passes its own fetcher rather than reusing one
 * that would resolve to whichever scope the viewer happens to be signed in as.
 */
export function useEnergyForecast(
  initial: EnergyForecast,
  fetchForecast: (horizon: ForecastHorizon) => Promise<EnergyForecast> = getEnergyForecast
) {
  const [forecast, setForecast] = useState(initial);
  const [horizon, setHorizonState] = useState<ForecastHorizon>(initial.horizonMonths);
  const [isPending, startTransition] = useTransition();

  const setHorizon = useCallback((next: ForecastHorizon) => {
    setHorizonState(next);
    startTransition(async () => {
      const result = await fetchForecast(next);
      setForecast(result);
    });
  }, [fetchForecast]);

  return { forecast, horizon, setHorizon, isPending };
}
