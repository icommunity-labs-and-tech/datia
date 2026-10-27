export interface ParsedCsvRow {
  /** The line the row starts on, counting the header as line 1. */
  line: number;
  values: Record<string, string>;
}

export interface ParsedCsv {
  headers: string[];
  rows: ParsedCsvRow[];
}

const DELIMITERS = [';', ',', '\t'] as const;

/**
 * The delimiter the header uses. Excel saves CSV with `;` wherever the decimal
 * separator is a comma — Spain included — so `,` cannot be assumed.
 */
function detectDelimiter(text: string): string {
  const header = text.slice(0, text.search(/\r?\n|$/));
  let best: string = ',';
  let bestCount = 0;
  for (const d of DELIMITERS) {
    let count = 0;
    let quoted = false;
    for (const ch of header) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** Splits CSV text into records, honouring quotes (and line breaks inside them). */
function records(text: string, delimiter: string): Array<{ line: number; cells: string[] }> {
  const out: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cells.push(cell);
      out.push({ line: start, cells });
      cells = [];
      cell = '';
      line++;
      start = line;
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  out.push({ line: start, cells });

  return out.filter((r) => r.cells.some((c) => c.trim() !== ''));
}

/** Parses CSV text into rows keyed by their (trimmed) header. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, '');
  if (!clean.trim()) return { headers: [], rows: [] };

  const [header, ...body] = records(clean, detectDelimiter(clean));
  const headers = header.cells.map((h) => h.trim());
  return {
    headers,
    rows: body.map(({ line, cells }) => ({
      line,
      values: Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])),
    })),
  };
}

/**
 * A number as Spanish or English spreadsheets write it: `36,72`, `36.72`,
 * `1.234,5` or `1,234.5`. With both separators, the last one is the decimal
 * point. Returns null for anything that is not a number.
 */
export function parseDecimal(value: string): number | null {
  const v = value.trim().replace(/\s/g, '');
  if (!/^[+-]?[\d.,]+$/.test(v) || !/\d/.test(v)) return null;

  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  let normalized = v;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  } else if (lastComma >= 0) {
    if ((v.match(/,/g) ?? []).length > 1) return null;
    normalized = v.replace(',', '.');
  } else if ((v.match(/\./g) ?? []).length > 1) {
    return null;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
