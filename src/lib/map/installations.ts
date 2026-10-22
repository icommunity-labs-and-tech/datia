/**
 * Installations, derived from where assets are.
 *
 * Datia has no installation entity, and deliberately so for now: a site is not
 * something anyone declares, it is what emerges when several assets sit in the
 * same place. Deriving it instead of asking someone to maintain it means an
 * asset that moves changes installation on its own.
 *
 * Assets are grouped by the municipality their coordinates fall in
 * (`groupByMunicipality`), which is what people call a place by. Those with no
 * municipality — coordinates nowhere near one — fall back to proximity.
 *
 * Proximity grouping is by radius rather than by a fixed number of clusters: how many
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
  /** Municipality its coordinates fall in, resolved on the server. */
  municipality?: { name: string; province: string } | null;
}

export interface Installation<T extends Located = Located> {
  id: string;
  /** Municipality name; null for groups formed by proximity alone. */
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

  return groups.map((members) => toInstallation(members, null)).sort(bySize);
}

/**
 * Groups located items by municipality; items without one are grouped by
 * proximity instead. A municipality name shared by two groups (Castejón in
 * Cuenca and in Navarra) carries its province.
 */
export function groupByMunicipality<T extends Located>(items: T[]): Array<Installation<T>> {
  const byPlace = new Map<string, T[]>();
  const unplaced: T[] = [];
  for (const item of items) {
    if (!item.municipality) {
      unplaced.push(item);
      continue;
    }
    const key = `${item.municipality.name}|${item.municipality.province}`;
    byPlace.set(key, [...(byPlace.get(key) ?? []), item]);
  }

  const groups = [...byPlace.values()];
  const nameCount = new Map<string, number>();
  for (const [first] of groups) {
    nameCount.set(first.municipality!.name, (nameCount.get(first.municipality!.name) ?? 0) + 1);
  }

  const placed = groups.map((members) => {
    const { name, province } = members[0].municipality!;
    return toInstallation(members, nameCount.get(name)! > 1 ? `${name} (${province})` : name);
  });
  return [...placed, ...clusterInstallations(unplaced)].sort(bySize);
}

function toInstallation<T extends Located>(members: T[], label: string | null): Installation<T> {
  const centre = centroid(members);
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    // Derived from the members, so the same site keeps its id across reloads.
    id: sorted.map((m) => m.id).join('|'),
    label,
    lat: parseFloat(centre.lat.toFixed(6)),
    lng: parseFloat(centre.lng.toFixed(6)),
    members: sorted,
    spreadMeters: Math.round(members.reduce((max, m) => Math.max(max, distanceMeters(centre, m)), 0)),
  };
}

function bySize(a: Installation, b: Installation) {
  return b.members.length - a.members.length || a.lat - b.lat;
}
