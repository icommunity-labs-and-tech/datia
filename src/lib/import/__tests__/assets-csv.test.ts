import { describe, it, expect } from 'vitest';
import { assetCsvIds, assetCsvTemplate, readAssetsCsv, MAX_ASSET_ROWS, type AssetCsvDeps } from '../assets-csv';
import { findMunicipality, nearestMunicipality } from '@/lib/map/municipality';

const deps = (takenIds: string[] = []): AssetCsvDeps => ({
  takenIds: new Set(takenIds),
  findMunicipality,
  nearestMunicipality,
});

describe('readAssetsCsv', () => {
  it('reads the template it hands out, locating one row by coordinates and one by municipality', () => {
    const { fileIssues, rows } = readAssetsCsv(assetCsvTemplate(), deps());
    expect(fileIssues).toEqual([]);
    expect(rows.map((r) => [r.id, r.locatedBy, r.municipality, r.issues])).toEqual([
      ['TURB-001', 'coordinates', 'Belmonte de Gracián', []],
      ['CALD-002', 'municipality', 'Castejón', []],
    ]);
    expect(rows[0]).toMatchObject({ latitude: 41.31, longitude: -1.55, description: 'Parque eólico norte' });
  });

  it('accepts English headers, in any case and with accents', () => {
    const { rows } = readAssetsCsv('ID,Name,Descripción\nA-1,Turbina,Nave\n', deps());
    expect(rows[0]).toMatchObject({ id: 'A-1', name: 'Turbina', description: 'Nave', locatedBy: null });
  });

  it('refuses a file without the id and name columns, naming them as the template does', () => {
    expect(readAssetsCsv('codigo,titulo\nA,B\n', deps()).fileIssues).toEqual([
      { code: 'missing_columns', columns: ['id', 'nombre'] },
    ]);
  });

  it('refuses an empty file and one over the row limit', () => {
    expect(readAssetsCsv('id,nombre\n', deps()).fileIssues).toEqual([{ code: 'empty' }]);
    const big = ['id,nombre', ...Array.from({ length: MAX_ASSET_ROWS + 1 }, (_, i) => `A-${i},Activo`)].join('\n');
    expect(readAssetsCsv(big, deps()).fileIssues).toEqual([
      { code: 'too_many_rows', rows: MAX_ASSET_ROWS + 1, max: MAX_ASSET_ROWS },
    ]);
  });

  it('flags missing fields, repeated IDs and IDs already in use', () => {
    const { rows } = readAssetsCsv('id,nombre\nA-1,Uno\nA-1,Otra vez\n,Sin id\nA-2,\nUSED,Ocupado\n', deps(['USED']));
    expect(rows.map((r) => [r.line, r.issues])).toEqual([
      [2, []],
      [3, [{ code: 'duplicate_id', field: 'id', firstLine: 2 }]],
      [4, [{ code: 'required', field: 'id' }]],
      [5, [{ code: 'required', field: 'name' }]],
      [6, [{ code: 'id_taken', field: 'id' }]],
    ]);
  });

  it('flags coordinates that are not numbers, out of range or half missing', () => {
    const { rows } = readAssetsCsv(
      'id;nombre;latitud;longitud\nA;a;36°N;-4,4\nB;b;95;-4,4\nC;c;36,7;\n',
      deps()
    );
    expect(rows.map((r) => r.issues)).toEqual([
      [{ code: 'invalid_number', field: 'latitude', value: '36°N' }],
      [{ code: 'out_of_range', field: 'latitude', value: '95' }],
      [{ code: 'partial_coordinates', field: 'longitude' }],
    ]);
    expect(rows.every((r) => r.latitude == null)).toBe(true);
  });

  it('asks for the province when a municipality name is shared, and says when it does not know one', () => {
    const { rows } = readAssetsCsv('id,nombre,municipio\nA,a,Castejón\nB,b,Narnia\n', deps());
    expect(rows[0].issues).toEqual([
      { code: 'ambiguous_municipality', field: 'municipality', value: 'Castejón', provinces: expect.arrayContaining(['Navarra', 'Cuenca']) },
    ]);
    expect(rows[1].issues).toEqual([{ code: 'unknown_municipality', field: 'municipality', value: 'Narnia' }]);
  });

  it('prefers coordinates over the municipality when a row has both', () => {
    const { rows } = readAssetsCsv('id,nombre,latitud,longitud,municipio\nA,a,36.7213,-4.4214,Sevilla\n', deps());
    expect(rows[0]).toMatchObject({ locatedBy: 'coordinates', municipality: 'Málaga', issues: [] });
  });
});

describe('assetCsvIds', () => {
  it('lists the IDs a file declares, whatever its delimiter', () => {
    expect(assetCsvIds('ID;nombre\nA-1;x\n;y\nA-2;z\n')).toEqual(['A-1', 'A-2']);
  });
});
