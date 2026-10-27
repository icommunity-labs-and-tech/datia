import { describe, it, expect } from 'vitest';
import { parseCsv, parseDecimal } from '../csv';

describe('parseCsv', () => {
  it('reads comma-separated files', () => {
    expect(parseCsv('id,nombre\nA-1,Turbina\n')).toEqual({
      headers: ['id', 'nombre'],
      rows: [{ line: 2, values: { id: 'A-1', nombre: 'Turbina' } }],
    });
  });

  it('reads the semicolon files Excel saves in Spanish, and drops its BOM', () => {
    const csv = '﻿id;nombre;latitud\r\nA-1;Turbina;36,72\r\n';
    expect(parseCsv(csv).rows[0].values).toEqual({ id: 'A-1', nombre: 'Turbina', latitud: '36,72' });
  });

  it('keeps delimiters and line breaks that sit inside quotes', () => {
    const { rows } = parseCsv('id,descripcion\nA-1,"Nave 2, planta baja\nlado norte"\nA-2,"Dice ""hola"""\n');
    expect(rows.map((r) => [r.line, r.values.descripcion])).toEqual([
      [2, 'Nave 2, planta baja\nlado norte'],
      [4, 'Dice "hola"'],
    ]);
  });

  it('skips blank lines and fills missing cells with empty strings', () => {
    const { rows } = parseCsv('id,nombre,descripcion\n\nA-1,Turbina\n,,\n');
    expect(rows).toEqual([{ line: 3, values: { id: 'A-1', nombre: 'Turbina', descripcion: '' } }]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('  \n')).toEqual({ headers: [], rows: [] });
  });
});

describe('parseDecimal', () => {
  it.each([
    ['36,72', 36.72],
    ['36.72', 36.72],
    ['-4,4214', -4.4214],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['12', 12],
  ])('reads %s as %d', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '1.2.3', '36°N'])('refuses %j', (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});
