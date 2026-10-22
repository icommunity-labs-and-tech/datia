// Server-side only: the table is ~700 KB and has no business in the browser.
import table from './municipalities-es.json';
import { distanceMeters } from './installations';

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
