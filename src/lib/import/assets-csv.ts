import { parseCsv, parseDecimal } from '@/lib/csv';
import { normalizePlace } from '@/lib/map/place-name';
import type { Municipality, MunicipalityMatch } from '@/lib/map/municipality';

/**
 * Reads a CSV of assets into rows ready to create, and everything wrong with
 * it, before anything is written. Pure: the database and the municipality
 * table come in as functions.
 */

export const MAX_ASSET_ROWS = 500;

/** Comfortably above a 500-row CSV of assets; anything bigger is not one. */
export const MAX_ASSET_CSV_LENGTH = 2 * 1024 * 1024;

/**
 * Each asset waits on iBS for its evidence, so a file is created a few rows per
 * call: no request runs long enough to time out, and the page can show progress.
 */
export const IMPORT_BATCH_SIZE = 5;

/** Each field and the headers it answers to, Spanish first (what the template uses). */
export const ASSET_COLUMNS = {
  id: ['id'],
  name: ['nombre', 'name'],
  description: ['descripcion', 'description'],
  latitude: ['latitud', 'latitude', 'lat'],
  longitude: ['longitud', 'longitude', 'lng', 'lon'],
  municipality: ['municipio', 'municipality'],
  province: ['provincia', 'province'],
} as const;

export type AssetField = keyof typeof ASSET_COLUMNS;

export type AssetIssue =
  | { code: 'required'; field: 'id' | 'name' }
  | { code: 'duplicate_id'; field: 'id'; firstLine: number }
  | { code: 'id_taken'; field: 'id' }
  | { code: 'invalid_number'; field: 'latitude' | 'longitude'; value: string }
  | { code: 'out_of_range'; field: 'latitude' | 'longitude'; value: string }
  | { code: 'partial_coordinates'; field: 'latitude' | 'longitude' }
  | { code: 'unknown_municipality'; field: 'municipality'; value: string }
  | { code: 'ambiguous_municipality'; field: 'municipality'; value: string; provinces: string[] };

export type FileIssue =
  | { code: 'empty' }
  | { code: 'too_large' }
  | { code: 'missing_columns'; columns: string[] }
  | { code: 'too_many_rows'; rows: number; max: number };

export interface AssetCsvRow {
  line: number;
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  /** The municipality the row will be grouped under, however it was located. */
  municipality: string | null;
  locatedBy: 'coordinates' | 'municipality' | null;
  issues: AssetIssue[];
}

export interface AssetCsvResult {
  fileIssues: FileIssue[];
  rows: AssetCsvRow[];
}

export interface AssetCsvDeps {
  /** IDs already in use. Asset IDs are unique across all organisations, not per company. */
  takenIds: Set<string>;
  findMunicipality: (name: string, province?: string | null) => MunicipalityMatch;
  nearestMunicipality: (lat: number, lng: number) => Municipality | null;
}

/** The header in the file that a field reads from, if any. */
function columnFor(headers: string[], field: AssetField): string | undefined {
  const aliases: readonly string[] = ASSET_COLUMNS[field];
  return headers.find((h) => aliases.includes(normalizePlace(h)));
}

/** The IDs a file declares, so the caller can ask the database which are taken. */
export function assetCsvIds(text: string): string[] {
  const { headers, rows } = parseCsv(text);
  const col = columnFor(headers, 'id');
  return col ? rows.map((r) => r.values[col]).filter(Boolean) : [];
}

export function readAssetsCsv(text: string, deps: AssetCsvDeps): AssetCsvResult {
  const { headers, rows } = parseCsv(text);
  if (rows.length === 0) return { fileIssues: [{ code: 'empty' }], rows: [] };

  const col = Object.fromEntries(
    (Object.keys(ASSET_COLUMNS) as AssetField[]).map((f) => [f, columnFor(headers, f)])
  ) as Record<AssetField, string | undefined>;

  const missing = (['id', 'name'] as const).filter((f) => !col[f]).map((f) => ASSET_COLUMNS[f][0]);
  if (missing.length) return { fileIssues: [{ code: 'missing_columns', columns: missing }], rows: [] };
  if (rows.length > MAX_ASSET_ROWS) {
    return { fileIssues: [{ code: 'too_many_rows', rows: rows.length, max: MAX_ASSET_ROWS }], rows: [] };
  }

  const read = (values: Record<string, string>, field: AssetField) => (col[field] ? values[col[field]!] ?? '' : '');
  const firstLineOf = new Map<string, number>();

  return {
    fileIssues: [],
    rows: rows.map(({ line, values }) => {
      const issues: AssetIssue[] = [];
      const id = read(values, 'id');
      const name = read(values, 'name');

      if (!id) issues.push({ code: 'required', field: 'id' });
      else if (firstLineOf.has(id)) issues.push({ code: 'duplicate_id', field: 'id', firstLine: firstLineOf.get(id)! });
      else if (deps.takenIds.has(id)) issues.push({ code: 'id_taken', field: 'id' });
      if (id && !firstLineOf.has(id)) firstLineOf.set(id, line);
      if (!name) issues.push({ code: 'required', field: 'name' });

      // Coordinates win over a municipality name: they say exactly where.
      let latitude: number | null = null;
      let longitude: number | null = null;
      let municipality: string | null = null;
      let locatedBy: AssetCsvRow['locatedBy'] = null;

      const rawLat = read(values, 'latitude');
      const rawLng = read(values, 'longitude');
      if (rawLat || rawLng) {
        const lat = rawLat ? parseDecimal(rawLat) : null;
        const lng = rawLng ? parseDecimal(rawLng) : null;
        if (rawLat && lat == null) issues.push({ code: 'invalid_number', field: 'latitude', value: rawLat });
        else if (lat != null && Math.abs(lat) > 90) issues.push({ code: 'out_of_range', field: 'latitude', value: rawLat });
        if (rawLng && lng == null) issues.push({ code: 'invalid_number', field: 'longitude', value: rawLng });
        else if (lng != null && Math.abs(lng) > 180) issues.push({ code: 'out_of_range', field: 'longitude', value: rawLng });
        if (!rawLat || !rawLng) issues.push({ code: 'partial_coordinates', field: rawLat ? 'longitude' : 'latitude' });

        if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          latitude = lat;
          longitude = lng;
          municipality = deps.nearestMunicipality(lat, lng)?.name ?? null;
          locatedBy = 'coordinates';
        }
      } else if (read(values, 'municipality')) {
        const name = read(values, 'municipality');
        const match = deps.findMunicipality(name, read(values, 'province') || null);
        if (match.status === 'found') {
          latitude = match.lat;
          longitude = match.lng;
          municipality = match.name;
          locatedBy = 'municipality';
        } else if (match.status === 'ambiguous') {
          issues.push({ code: 'ambiguous_municipality', field: 'municipality', value: name, provinces: match.provinces });
        } else {
          issues.push({ code: 'unknown_municipality', field: 'municipality', value: name });
        }
      }

      return {
        line,
        id,
        name,
        description: read(values, 'description') || null,
        latitude,
        longitude,
        municipality,
        locatedBy,
        issues,
      };
    }),
  };
}

/** A template with every column and two examples: one by coordinates, one by municipality. */
export function assetCsvTemplate(): string {
  const header = (Object.keys(ASSET_COLUMNS) as AssetField[]).map((f) => ASSET_COLUMNS[f][0]);
  return [
    header.join(';'),
    'TURB-001;Turbina eólica T-100;Parque eólico norte;41,3100;-1,5500;;',
    'CALD-002;Caldera de biomasa;Nave 2;;;Castejón;Navarra',
  ].join('\r\n') + '\r\n';
}
