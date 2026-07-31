import type { EnergyCarrier } from '@/domain/energy/EnergyTypes';

// Pure data — no Leaflet/react-leaflet import here. Leaflet's own module code
// touches `window` at eval time and is not SSR-safe, so anything that only
// needs the color map (badges, KPI charts) must not import it transitively
// via EnergySourcesGlobalMap.tsx (which is client-map-only, loaded via
// EnergySourcesGlobalMapLazy with ssr:false).
export const CARRIER_COLORS: Record<EnergyCarrier, string> = {
  ELECTRICITY: '#1752CC',
  NATURAL_GAS: '#f76707',
  HYDROGEN: '#7950f2',
  SOLAR_THERMAL: '#f59f00',
  DISTRICT_HEATING: '#e64980',
  DISTRICT_COOLING: '#1098ad',
  BIOMASS: '#2f9e44',
  OIL: '#5c3317',
  COAL: '#495057',
  OTHER: '#868e96',
};
