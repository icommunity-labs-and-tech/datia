'use server';

import { requireScope } from '@/lib/auth/tenant';
import { findMunicipality, nearestMunicipality, type Municipality, type MunicipalityMatch } from '@/lib/map/municipality';

/** The municipality a point will be grouped under — the same lookup the assets page uses. */
export async function municipalityAt(lat: number, lng: number): Promise<Municipality | null> {
  await requireScope();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return nearestMunicipality(lat, lng);
}

/**
 * A municipality by what someone typed: "Málaga", or "Castejón, Navarra" when
 * the name is shared. Answers with its seat, to drop the pin on.
 */
export async function searchMunicipality(query: string): Promise<MunicipalityMatch> {
  await requireScope();
  const q = query.trim().slice(0, 120);
  if (!q) return { status: 'unknown' };

  const whole = findMunicipality(q);
  const comma = q.lastIndexOf(',');
  if (whole.status === 'found' || comma < 0) return whole;

  // "Castejón, Navarra": the part after the last comma may be the province —
  // unless it is an article ("Campillo, El"), which the whole-name lookup took.
  const byProvince = findMunicipality(q.slice(0, comma), q.slice(comma + 1));
  return byProvince.status === 'unknown' ? whole : byProvince;
}
