import { describe, it, expect } from 'vitest';
import { nearestMunicipality } from '../municipality';

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
