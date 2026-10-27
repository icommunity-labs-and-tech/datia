import { describe, it, expect } from 'vitest';
import { findMunicipality, nearestMunicipality } from '../municipality';
import { normalizePlace } from '../place-name';

describe('nearestMunicipality', () => {
  it.each([
    [36.7213, -4.4214, 'Málaga'], // city centre
    [37.3891, -5.9845, 'Sevilla'], // GeoNames calls it «Seville»
    [37.8882, -4.7794, 'Córdoba'],
    [40.4168, -3.7038, 'Madrid'],
    // Edge of a large term: a per-municipality centroid put it in La Laguna.
    [28.4636, -16.2518, 'Santa Cruz de Tenerife'],
    // Neighbours a few kilometres apart.
    [36.6236, -4.4996, 'Torremolinos'],
    [36.675, -4.49, 'Málaga'], // the airport, in Churriana
    [41.3598, 2.0999, "L'Hospitalet de Llobregat"],
  ])('places %f,%f in %s', (lat, lng, name) => {
    expect(nearestMunicipality(lat, lng)?.name).toBe(name);
  });

  it('carries the province', () => {
    expect(nearestMunicipality(36.7213, -4.4214)).toEqual({ name: 'Málaga', province: 'Málaga' });
  });

  it('refuses coordinates nowhere near a Spanish municipality', () => {
    expect(nearestMunicipality(0, 0)).toBeNull();
    expect(nearestMunicipality(48.8566, 2.3522)).toBeNull(); // Paris
  });
});

describe('findMunicipality', () => {
  it('ignores accents, case and spacing', () => {
    expect(findMunicipality('  MALAGA ')).toMatchObject({ status: 'found', name: 'Málaga', province: 'Málaga' });
  });

  it('takes the article on either side', () => {
    expect(findMunicipality('Campillo de la Jara, El')).toMatchObject({ status: 'found', name: 'El Campillo de la Jara' });
  });

  it('answers to each half of a bilingual name', () => {
    expect(findMunicipality('San Sebastián')).toMatchObject({ status: 'found', province: 'Gipuzkoa' });
    expect(findMunicipality('Donostia')).toMatchObject({ status: 'found', province: 'Gipuzkoa' });
  });

  it('asks for the province when the name is shared', () => {
    expect(findMunicipality('Castejón')).toEqual({ status: 'ambiguous', provinces: expect.arrayContaining(['Cuenca', 'Navarra']) });
    expect(findMunicipality('Castejón', 'navarra')).toMatchObject({ status: 'found', province: 'Navarra' });
  });

  it('places the asset where its own lookup would find it again', () => {
    const m = findMunicipality('Sevilla');
    expect(m.status).toBe('found');
    if (m.status === 'found') expect(nearestMunicipality(m.lat, m.lng)?.name).toBe('Sevilla');
  });

  it('says so when it does not know the name', () => {
    expect(findMunicipality('Narnia')).toEqual({ status: 'unknown' });
  });
});

describe('normalizePlace', () => {
  it("joins an apostrophe article without a space", () => {
    expect(normalizePlace("Hospitalet de Llobregat, L'")).toBe("l'hospitalet de llobregat");
  });
});
