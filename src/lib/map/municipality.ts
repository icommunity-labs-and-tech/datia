// Server-side only: the table is ~900 KB and has no business in the browser.
import table from './municipalities-es.json';
import { distanceMeters } from './installations';
import { normalizePlace } from './place-name';

export interface Municipality {
  name: string;
  province: string;
}

/**
 * Beyond this, the nearest settlement is not where the asset is: its
 * coordinates are wrong (0,0, swapped lat/lng) or it is outside Spain.
 */
const MAX_DISTANCE_METERS = 50_000;

const municipalities = table.municipalities as Array<[string, string]>;
const centres = table.centres as number[];
const points = table.points as number[];

/**
 * The municipality of the populated place nearest to a point (GeoNames, CC BY 4.0).
 *
 * Nearest settlement, not the polygon that contains the point: an asset right
 * by a municipal boundary can still land in the neighbouring one. Good enough
 * to group a company's assets by place.
 */
export function nearestMunicipality(lat: number, lng: number): Municipality | null {
  // Equirectangular distance ranks candidates; only the winner pays for haversine.
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < points.length; i += 3) {
    const dLat = points[i] - lat;
    const dLng = (points[i + 1] - lng) * cosLat;
    const score = dLat * dLat + dLng * dLng;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (distanceMeters({ lat, lng }, { lat: points[best], lng: points[best + 1] }) > MAX_DISTANCE_METERS) {
    return null;
  }
  const [name, province] = municipalities[points[best + 2]];
  return { name, province };
}

let byName: Map<string, number[]> | null = null;

/** Every way a municipality can be written, pointing at its index. */
function nameIndex() {
  if (byName) return byName;
  byName = new Map();
  municipalities.forEach(([name], i) => {
    // Bilingual names ("Donostia / San Sebastián") answer to each part too.
    const forms = new Set([name, ...name.split('/')].map((f) => normalizePlace(f)).filter(Boolean));
    for (const form of forms) byName!.set(form, [...(byName!.get(form) ?? []), i]);
  });
  return byName;
}

export type MunicipalityMatch =
  | { status: 'found'; name: string; province: string; lat: number; lng: number }
  | { status: 'ambiguous'; provinces: string[] }
  | { status: 'unknown' };

/**
 * A municipality by name, for when that is all that is known of where an asset
 * is. The province settles names shared by several (Castejón, Moya, Cieza…).
 */
export function findMunicipality(name: string, province?: string | null): MunicipalityMatch {
  let hits = nameIndex().get(normalizePlace(name)) ?? [];
  if (province?.trim()) {
    const wanted = normalizePlace(province);
    hits = hits.filter((i) => normalizePlace(municipalities[i][1]).includes(wanted));
  }
  if (hits.length === 0) return { status: 'unknown' };
  if (hits.length > 1) return { status: 'ambiguous', provinces: hits.map((i) => municipalities[i][1]) };
  const i = hits[0];
  return { status: 'found', name: municipalities[i][0], province: municipalities[i][1], lat: centres[2 * i], lng: centres[2 * i + 1] };
}
