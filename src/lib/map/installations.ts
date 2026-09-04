/**
 * Installations, derived from where assets are.
 *
 * Datia has no installation entity, and deliberately so for now: a site is not
 * something anyone declares, it is what emerges when several assets sit in the
 * same place. Grouping by proximity discovers them instead of asking someone to
 * maintain them, and an asset that moves changes installation on its own.
 *
 * Grouping is by radius rather than by a fixed number of clusters: how many
 * installations an organisation has is precisely what is not known in advance,
 * and a k-based method would have to be told. A radius also matches the physical
 * question being asked — «is this in the same place?» — and copes with one site
 * holding three assets and another forty.
 */

export interface Located {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Place name, when any of the asset's energy sources declares one. */
  siteName?: string | null;
}

export interface Installation<T extends Located = Located> {
  id: string;
  /**
   * What to call it. Taken from the first member that knows its place name;
   * installations are derived from coordinates, so there is nothing to read it
   * from when no member carries one.
   */
  label: string | null;
  /** Centroid of its members. */
  lat: number;
  lng: number;
  members: T[];
  /** Distance from the centroid to the furthest member, in metres. */
  spreadMeters: number;
}

/** Assets within this distance of each other belong to the same installation. */
export const DEFAULT_RADIUS_METERS = 500;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isLocated(value: unknown): value is { lat: number; lng: number } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { lat: unknown }).lat === 'number' &&
    typeof (value as { lng: unknown }).lng === 'number'
  );
}

/**
 * Pulls the first geolocation value out of a template's stored fields. Position
 * lives in user-defined templates rather than in a column, so which key holds it
 * depends on how the template was named.
 */
export function geolocationOf(templateFields: unknown): { lat: number; lng: number } | null {
  if (!templateFields || typeof templateFields !== 'object') return null;
  for (const value of Object.values(templateFields as Record<string, unknown>)) {
    if (isLocated(value)) return value;
  }
  return null;
}

function centroid(points: Array<{ lat: number; lng: number }>): { lat: number; lng: number } {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/**
 * Groups located items into installations.
 *
 * Single-link clustering: an item joins a group when it is within `radius` of
 * *any* member, not of the group's centre. That is what lets an installation
 * spread along a row of panels or a rooftop without splitting in two, while two
 * genuinely separate sites stay apart however many assets each holds.
 *
 * Deterministic: input order does not change the result, because members and
 * groups are sorted before returning.
 */
export function clusterInstallations<T extends Located>(
  items: T[],
  radiusMeters: number = DEFAULT_RADIUS_METERS
): Array<Installation<T>> {
  const pending = [...items];
  const groups: T[][] = [];

  while (pending.length) {
    const group = [pending.shift()!];

    // Grow the group until nothing else is within reach of any of its members.
    for (let i = 0; i < group.length; i++) {
      for (let j = pending.length - 1; j >= 0; j--) {
        if (distanceMeters(group[i], pending[j]) <= radiusMeters) {
          group.push(pending.splice(j, 1)[0]);
        }
      }
    }
    groups.push(group);
  }

  return groups
    .map((members) => {
      const centre = centroid(members);
      const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'));
      return {
        // Derived from the members, so the same site keeps its id across reloads.
        id: sorted.map((m) => m.id).join('|'),
        label: sorted.find((m) => m.siteName)?.siteName ?? null,
        lat: parseFloat(centre.lat.toFixed(6)),
        lng: parseFloat(centre.lng.toFixed(6)),
        members: sorted,
        spreadMeters: Math.round(
          members.reduce((max, m) => Math.max(max, distanceMeters(centre, m)), 0)
        ),
      };
    })
    .sort((a, b) => b.members.length - a.members.length || a.lat - b.lat);
}
