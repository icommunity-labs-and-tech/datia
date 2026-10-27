import { parseCsv, parseDecimal } from '@/lib/csv';
import { normalizePlace } from '@/lib/map/place-name';

/**
 * Reads a CSV of consumption readings for one energy source — what a meter or
 * BMS exports — into rows ready to write, with the emission each one implies.
 * Pure: the source and the readings already stored come in as data.
 */

export const MAX_READING_ROWS = 10_000;
/** Server actions take up to 1 MB; this leaves room for the rest of the request. */
export const MAX_READINGS_CSV_LENGTH = 900 * 1024;

export const LIFECYCLE_STAGES = ['MANUFACTURING', 'TRANSPORT', 'USE', 'MAINTENANCE', 'END_OF_LIFE'] as const;
export const EMISSION_SCOPES = ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];
export type EmissionScope = (typeof EMISSION_SCOPES)[number];

/** Each field and the headers it answers to, Spanish first (what the template uses). */
export const READING_COLUMNS = {
  start: ['inicio', 'fecha', 'fecha_inicio', 'periodo_inicio', 'start', 'date', 'period_start', 'periodstart'],
  end: ['fin', 'fecha_fin', 'periodo_fin', 'end', 'period_end', 'periodend'],
  kwh: ['kwh', 'consumo', 'consumo_kwh', 'consumption', 'consumption_kwh', 'consumptionkwh'],
  stage: ['fase', 'etapa', 'stage', 'lifecycle_stage', 'lifecyclestage'],
  co2eKg: ['co2e_kg', 'co2e', 'kg_co2e', 'co2ekg'],
  scope: ['alcance', 'scope'],
  factor: ['factor', 'factor_emision', 'emission_factor', 'emissionfactor'],
} as const;

export type ReadingField = keyof typeof READING_COLUMNS;

/** Emissions from burning fuel on site are scope 1; bought energy is scope 2. */
export function scopeForCarrier(carrier: string): EmissionScope {
  return ['ELECTRICITY', 'DISTRICT_HEATING', 'DISTRICT_COOLING', 'OTHER'].includes(carrier) ? 'SCOPE_2' : 'SCOPE_1';
}

const STAGE_NAMES: Record<string, LifecycleStage> = {
  uso: 'USE',
  use: 'USE',
  fabricacion: 'MANUFACTURING',
  manufacturing: 'MANUFACTURING',
  transporte: 'TRANSPORT',
  transport: 'TRANSPORT',
  mantenimiento: 'MAINTENANCE',
  maintenance: 'MAINTENANCE',
  findevida: 'END_OF_LIFE',
  endoflife: 'END_OF_LIFE',
};

export type ReadingIssue =
  | { code: 'required'; field: 'start' | 'kwh' }
  | { code: 'invalid_date'; field: 'start' | 'end'; value: string }
  | { code: 'invalid_number'; field: 'kwh' | 'co2eKg' | 'factor'; value: string }
  | { code: 'not_positive'; field: 'kwh' }
  | { code: 'negative'; field: 'co2eKg' | 'factor' }
  | { code: 'end_before_start'; field: 'end' }
  | { code: 'duplicate_period'; field: 'start'; firstLine: number }
  | { code: 'unknown_stage'; field: 'stage'; value: string }
  | { code: 'unknown_scope'; field: 'scope'; value: string };

export type ReadingsFileIssue =
  | { code: 'empty' }
  | { code: 'too_large' }
  | { code: 'missing_columns'; columns: string[] }
  | { code: 'too_many_rows'; rows: number; max: number };

export interface ReadingRow {
  line: number;
  periodStart: string;
  periodEnd: string;
  kwh: number;
  stage: LifecycleStage;
  /** Null when there is no way to tell: no CO₂e column and no factor. */
  co2eKg: number | null;
  scope: EmissionScope;
  /** The factor the CO₂e was computed with; null when the file gave CO₂e itself. */
  factor: number | null;
  /** A reading for the same period is already stored, and whether it is on chain. */
  existing: 'certified' | 'uncertified' | null;
  issues: ReadingIssue[];
}

export interface ReadingsCsvResult {
  fileIssues: ReadingsFileIssue[];
  rows: ReadingRow[];
}

export interface ReadingsCsvDeps {
  source: { energyCarrier: string; gridEmissionFactor: number | null };
  /** Readings already stored for the source, by `periodKey`. */
  existing: Map<string, 'certified' | 'uncertified'>;
}

export const periodKey = (start: Date | string, end: Date | string) =>
  `${new Date(start).toISOString()}|${new Date(end).toISOString()}`;

const headerKey = (h: string) => normalizePlace(h).replace(/[^a-z0-9]/g, '');

function columnFor(headers: string[], field: ReadingField): string | undefined {
  const aliases = (READING_COLUMNS[field] as readonly string[]).map(headerKey);
  return headers.find((h) => aliases.includes(headerKey(h)));
}

/**
 * A date as spreadsheets write it — `2026-01-31`, `2026-01-31T08:00`,
 * `31/01/2026`, `31-01-2026 08:00` — read as UTC. `endOfDay` turns a date with
 * no time into its last second, so "until 31 January" covers the whole day.
 */
export function parseReadingDate(value: string, endOfDay = false): Date | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?)?$/);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else {
    m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    [d, mo, y] = [+m[1], +m[2], +m[3]];
  }
  const hasTime = m[4] != null;
  const [h, mi, s] = hasTime ? [+m[4], +m[5], +(m[6] ?? 0)] : endOfDay ? [23, 59, 59] : [0, 0, 0];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  // Rejects 31/02 and the like, which Date would roll over into March.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function readReadingsCsv(text: string, deps: ReadingsCsvDeps): ReadingsCsvResult {
  const { headers, rows } = parseCsv(text);
  if (rows.length === 0) return { fileIssues: [{ code: 'empty' }], rows: [] };

  const col = Object.fromEntries(
    (Object.keys(READING_COLUMNS) as ReadingField[]).map((f) => [f, columnFor(headers, f)])
  ) as Record<ReadingField, string | undefined>;
  const missing = (['start', 'kwh'] as const).filter((f) => !col[f]).map((f) => READING_COLUMNS[f][0]);
  if (missing.length) return { fileIssues: [{ code: 'missing_columns', columns: missing }], rows: [] };
  if (rows.length > MAX_READING_ROWS) {
    return { fileIssues: [{ code: 'too_many_rows', rows: rows.length, max: MAX_READING_ROWS }], rows: [] };
  }

  const read = (values: Record<string, string>, field: ReadingField) => (col[field] ? values[col[field]!] ?? '' : '');
  const firstLineOf = new Map<string, number>();
  const sourceScope = scopeForCarrier(deps.source.energyCarrier);

  return {
    fileIssues: [],
    rows: rows.map(({ line, values }) => {
      const issues: ReadingIssue[] = [];

      const rawStart = read(values, 'start');
      const rawEnd = read(values, 'end');
      const start = rawStart ? parseReadingDate(rawStart) : null;
      // With no end, a reading covers the day it starts on.
      const end = rawEnd ? parseReadingDate(rawEnd, true) : rawStart ? parseReadingDate(rawStart.slice(0, 10), true) : null;
      if (!rawStart) issues.push({ code: 'required', field: 'start' });
      else if (!start) issues.push({ code: 'invalid_date', field: 'start', value: rawStart });
      if (rawEnd && !end) issues.push({ code: 'invalid_date', field: 'end', value: rawEnd });
      if (start && end && end <= start) issues.push({ code: 'end_before_start', field: 'end' });

      const rawKwh = read(values, 'kwh');
      const kwh = rawKwh ? parseDecimal(rawKwh) : null;
      if (!rawKwh) issues.push({ code: 'required', field: 'kwh' });
      else if (kwh == null) issues.push({ code: 'invalid_number', field: 'kwh', value: rawKwh });
      else if (kwh <= 0) issues.push({ code: 'not_positive', field: 'kwh' });

      let stage: LifecycleStage = 'USE';
      const rawStage = read(values, 'stage');
      if (rawStage) {
        const known = STAGE_NAMES[headerKey(rawStage)] ?? LIFECYCLE_STAGES.find((s) => s === rawStage.toUpperCase());
        if (known) stage = known;
        else issues.push({ code: 'unknown_stage', field: 'stage', value: rawStage });
      }

      let scope = sourceScope;
      const rawScope = read(values, 'scope');
      if (rawScope) {
        const n = rawScope.replace(/\D/g, '');
        if (['1', '2', '3'].includes(n) && /^(scope_?|alcance ?)?[123]$/i.test(rawScope.trim())) scope = `SCOPE_${n}` as EmissionScope;
        else issues.push({ code: 'unknown_scope', field: 'scope', value: rawScope });
      }

      // CO₂e from the file wins; failing it, the row's factor; failing that, the source's.
      const rawCo2e = read(values, 'co2eKg');
      const rawFactor = read(values, 'factor');
      const co2eGiven = rawCo2e ? parseDecimal(rawCo2e) : null;
      const factorGiven = rawFactor ? parseDecimal(rawFactor) : null;
      if (rawCo2e && co2eGiven == null) issues.push({ code: 'invalid_number', field: 'co2eKg', value: rawCo2e });
      else if (co2eGiven != null && co2eGiven < 0) issues.push({ code: 'negative', field: 'co2eKg' });
      if (rawFactor && factorGiven == null) issues.push({ code: 'invalid_number', field: 'factor', value: rawFactor });
      else if (factorGiven != null && factorGiven < 0) issues.push({ code: 'negative', field: 'factor' });

      const factor = co2eGiven != null ? factorGiven : factorGiven ?? deps.source.gridEmissionFactor;
      const co2eKg =
        co2eGiven != null ? co2eGiven : factor != null && kwh != null ? Math.round(kwh * factor * 1000) / 1000 : null;

      let existing: ReadingRow['existing'] = null;
      if (start && end) {
        const key = periodKey(start, end);
        if (firstLineOf.has(key)) issues.push({ code: 'duplicate_period', field: 'start', firstLine: firstLineOf.get(key)! });
        else firstLineOf.set(key, line);
        existing = deps.existing.get(key) ?? null;
      }

      return {
        line,
        periodStart: start?.toISOString() ?? '',
        periodEnd: end?.toISOString() ?? '',
        kwh: kwh ?? 0,
        stage,
        co2eKg,
        scope,
        factor,
        existing,
        issues,
      };
    }),
  };
}

/** A template: daily readings, the emission computed from the source's factor. */
export function readingsCsvTemplate(): string {
  return ['inicio;fin;kwh;fase;co2e_kg;alcance;factor', '2026-01-01;2026-01-01;812,5;uso;;;', '2026-01-02;2026-01-02;798,1;uso;;;'].join('\r\n') + '\r\n';
}
