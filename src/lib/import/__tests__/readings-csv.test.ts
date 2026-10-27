import { describe, it, expect } from 'vitest';
import {
  parseReadingDate,
  periodKey,
  readingsCsvTemplate,
  readReadingsCsv,
  scopeForCarrier,
  MAX_READING_ROWS,
  type ReadingsCsvDeps,
} from '../readings-csv';

const deps = (overrides: Partial<ReadingsCsvDeps> = {}): ReadingsCsvDeps => ({
  source: { energyCarrier: 'ELECTRICITY', gridEmissionFactor: 0.2 },
  existing: new Map(),
  ...overrides,
});

describe('parseReadingDate', () => {
  it.each([
    ['2026-01-31', '2026-01-31T00:00:00.000Z'],
    ['2026-01-31T08:30', '2026-01-31T08:30:00.000Z'],
    ['31/01/2026', '2026-01-31T00:00:00.000Z'],
    ['1-2-2026 08:00', '2026-02-01T08:00:00.000Z'],
  ])('reads %s', (input, iso) => {
    expect(parseReadingDate(input)?.toISOString()).toBe(iso);
  });

  it('turns a bare date into the last second of the day when it closes a period', () => {
    expect(parseReadingDate('31/01/2026', true)?.toISOString()).toBe('2026-01-31T23:59:59.000Z');
  });

  it.each(['31/02/2026', '2026-13-01', 'enero', ''])('refuses %j', (input) => {
    expect(parseReadingDate(input)).toBeNull();
  });
});

describe('scopeForCarrier', () => {
  it('puts bought energy in scope 2 and fuel burnt on site in scope 1', () => {
    expect(scopeForCarrier('ELECTRICITY')).toBe('SCOPE_2');
    expect(scopeForCarrier('DISTRICT_HEATING')).toBe('SCOPE_2');
    expect(scopeForCarrier('NATURAL_GAS')).toBe('SCOPE_1');
    expect(scopeForCarrier('BIOMASS')).toBe('SCOPE_1');
  });
});

describe('readReadingsCsv', () => {
  it('reads the template, a day per row, the CO₂e from the source factor', () => {
    const { fileIssues, rows } = readReadingsCsv(readingsCsvTemplate(), deps());
    expect(fileIssues).toEqual([]);
    expect(rows[0]).toMatchObject({
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-01-01T23:59:59.000Z',
      kwh: 812.5,
      stage: 'USE',
      co2eKg: 162.5,
      factor: 0.2,
      scope: 'SCOPE_2',
      existing: null,
      issues: [],
    });
  });

  it('covers a whole month when the period runs from its first to its last day', () => {
    const { rows } = readReadingsCsv('inicio,fin,kwh\n2026-01-01,2026-01-31,1000\n', deps());
    expect([rows[0].periodStart, rows[0].periodEnd]).toEqual(['2026-01-01T00:00:00.000Z', '2026-01-31T23:59:59.000Z']);
  });

  it('takes CO₂e from the file first, then the row factor, then the source', () => {
    const { rows } = readReadingsCsv(
      'inicio;kwh;co2e_kg;factor\n2026-01-01;100;7;\n2026-01-02;100;;0,5\n2026-01-03;100;;\n',
      deps()
    );
    expect(rows.map((r) => [r.co2eKg, r.factor])).toEqual([
      [7, null],
      [50, 0.5],
      [20, 0.2],
    ]);
  });

  it('leaves the CO₂e unknown when neither the file nor the source gives a factor', () => {
    const { rows } = readReadingsCsv('inicio,kwh\n2026-01-01,100\n', deps({ source: { energyCarrier: 'NATURAL_GAS', gridEmissionFactor: null } }));
    expect(rows[0]).toMatchObject({ co2eKg: null, scope: 'SCOPE_1', issues: [] });
  });

  it('reads Spanish stages and scopes, and refuses unknown ones', () => {
    const { rows } = readReadingsCsv('inicio,kwh,fase,alcance\n2026-01-01,1,mantenimiento,3\n2026-01-02,1,Fin de vida,SCOPE_1\n2026-01-03,1,cocina,cuatro\n', deps());
    expect(rows.map((r) => [r.stage, r.scope])).toEqual([
      ['MAINTENANCE', 'SCOPE_3'],
      ['END_OF_LIFE', 'SCOPE_1'],
      ['USE', 'SCOPE_2'],
    ]);
    expect(rows[2].issues).toEqual([
      { code: 'unknown_stage', field: 'stage', value: 'cocina' },
      { code: 'unknown_scope', field: 'scope', value: 'cuatro' },
    ]);
  });

  it('flags missing, malformed and impossible values', () => {
    const { rows } = readReadingsCsv('inicio,fin,kwh\n,,5\n2026-01-05,2026-01-01,5\n2026-01-01,,abc\n2026-01-02,,0\n31/02/2026,,5\n', deps());
    expect(rows.map((r) => r.issues)).toEqual([
      [{ code: 'required', field: 'start' }],
      [{ code: 'end_before_start', field: 'end' }],
      [{ code: 'invalid_number', field: 'kwh', value: 'abc' }],
      [{ code: 'not_positive', field: 'kwh' }],
      [{ code: 'invalid_date', field: 'start', value: '31/02/2026' }],
    ]);
  });

  it('flags a period repeated in the file, and marks one already stored', () => {
    const stored = periodKey('2026-01-02T00:00:00.000Z', '2026-01-02T23:59:59.000Z');
    const { rows } = readReadingsCsv(
      'inicio,kwh\n2026-01-01,1\n2026-01-01,2\n2026-01-02,3\n',
      deps({ existing: new Map([[stored, 'certified']]) })
    );
    expect(rows[1].issues).toEqual([{ code: 'duplicate_period', field: 'start', firstLine: 2 }]);
    expect(rows[2]).toMatchObject({ existing: 'certified', issues: [] });
  });

  it('refuses files without the start and kWh columns, empty or over the limit', () => {
    expect(readReadingsCsv('dia,valor\n1,2\n', deps()).fileIssues).toEqual([{ code: 'missing_columns', columns: ['inicio', 'kwh'] }]);
    expect(readReadingsCsv('inicio,kwh\n', deps()).fileIssues).toEqual([{ code: 'empty' }]);
    const big = ['inicio,kwh', ...Array.from({ length: MAX_READING_ROWS + 1 }, () => '2026-01-01,1')].join('\n');
    expect(readReadingsCsv(big, deps()).fileIssues).toEqual([{ code: 'too_many_rows', rows: MAX_READING_ROWS + 1, max: MAX_READING_ROWS }]);
  });

  it('accepts English headers and spaced ones', () => {
    const { rows } = readReadingsCsv('Period start,Consumption kWh\n2026-01-01,4\n', deps());
    expect(rows[0]).toMatchObject({ kwh: 4, issues: [] });
  });
});
