import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RADIUS_METERS,
  clusterInstallations,
  distanceMeters,
  isLocated,
  type Located,
} from '../installations';

const asset = (id: string, lat: number, lng: number, name = id): Located => ({ id, name, lat, lng });

// Two real sites, far enough apart that nothing should ever merge them.
const ALCALA = { lat: 40.4818, lng: -3.3644 };
const EJEA = { lat: 42.1268, lng: -1.1381 };

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(ALCALA, ALCALA)).toBe(0);
  });

  it('measures a known separation', () => {
    // Alcalá to Ejea is about 261 km in a straight line: 1.645° of latitude
    // (183 km) against 2.226° of longitude at 41° N (186 km).
    const km = distanceMeters(ALCALA, EJEA) / 1000;
    expect(km).toBeGreaterThan(255);
    expect(km).toBeLessThan(267);
  });

  it('is symmetric', () => {
    expect(distanceMeters(ALCALA, EJEA)).toBeCloseTo(distanceMeters(EJEA, ALCALA), 6);
  });
});

describe('isLocated', () => {
  it('accepts a coordinate pair', () => {
    expect(isLocated({ lat: 40.1, lng: -3.2 })).toBe(true);
  });

  it('rejects anything that is not one', () => {
    expect(isLocated(null)).toBe(false);
    expect(isLocated('40.1, -3.2')).toBe(false);
    expect(isLocated([40.1, -3.2])).toBe(false);
    expect(isLocated({ lat: '40.1', lng: -3.2 })).toBe(false);
    expect(isLocated({ lat: 40.1 })).toBe(false);
  });
});


describe('clusterInstallations', () => {
  it('returns nothing for no assets', () => {
    expect(clusterInstallations([])).toEqual([]);
  });

  it('keeps distant sites apart', () => {
    const groups = clusterInstallations([
      asset('a', ALCALA.lat, ALCALA.lng),
      asset('b', EJEA.lat, EJEA.lng),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.members.length === 1)).toBe(true);
  });

  it('groups assets that share a site', () => {
    // Four assets scattered over about a hundred metres.
    const groups = clusterInstallations([
      asset('a', ALCALA.lat, ALCALA.lng),
      asset('b', ALCALA.lat + 0.0004, ALCALA.lng),
      asset('c', ALCALA.lat, ALCALA.lng + 0.0006),
      asset('d', ALCALA.lat - 0.0003, ALCALA.lng - 0.0002),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(4);
    expect(groups[0].spreadMeters).toBeLessThan(DEFAULT_RADIUS_METERS);
  });

  it('places the installation at the centre of its members', () => {
    const [group] = clusterInstallations([
      asset('a', 40.0, -3.0),
      asset('b', 40.002, -3.0),
    ]);
    expect(group.lat).toBeCloseTo(40.001, 5);
    expect(group.lng).toBeCloseTo(-3.0, 5);
  });

  it('follows a chain of assets beyond the radius from end to end', () => {
    // A row of panels: each within 300 m of the next, 900 m end to end. It is
    // one installation, not three, because proximity is to any member.
    const groups = clusterInstallations(
      [
        asset('a', 40.0, -3.0),
        asset('b', 40.0027, -3.0),
        asset('c', 40.0054, -3.0),
        asset('d', 40.0081, -3.0),
      ],
      500
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].spreadMeters).toBeGreaterThan(400);
  });

  it('splits when the gap exceeds the radius', () => {
    const groups = clusterInstallations(
      [asset('a', 40.0, -3.0), asset('b', 40.02, -3.0)], // ~2,2 km apart
      500
    );
    expect(groups).toHaveLength(2);
  });

  it('does not depend on the order the assets arrive in', () => {
    const points = [
      asset('a', ALCALA.lat, ALCALA.lng),
      asset('b', ALCALA.lat + 0.0004, ALCALA.lng),
      asset('c', EJEA.lat, EJEA.lng),
    ];
    const forward = clusterInstallations(points);
    const backward = clusterInstallations([...points].reverse());
    expect(backward.map((g) => g.id)).toEqual(forward.map((g) => g.id));
  });

  it('lists the biggest installation first', () => {
    const groups = clusterInstallations([
      asset('solo', EJEA.lat, EJEA.lng),
      asset('a', ALCALA.lat, ALCALA.lng),
      asset('b', ALCALA.lat + 0.0002, ALCALA.lng),
      asset('c', ALCALA.lat + 0.0004, ALCALA.lng),
    ]);
    expect(groups[0].members).toHaveLength(3);
    expect(groups[1].members).toHaveLength(1);
  });

  it('loses no asset along the way', () => {
    const points = Array.from({ length: 40 }, (_, i) =>
      asset(`a${i}`, 40 + (i % 7) * 0.05, -3 + Math.floor(i / 7) * 0.05)
    );
    const total = clusterInstallations(points).reduce((n, g) => n + g.members.length, 0);
    expect(total).toBe(points.length);
  });
});

describe('installation labels', () => {
  it('takes the name from whichever member knows its place', () => {
    const [group] = clusterInstallations([
      { id: 'a', name: 'Panel', lat: 40.0, lng: -3.0 },
      { id: 'b', name: 'Inversor', lat: 40.0002, lng: -3.0, siteName: 'Cubierta Alcalá' },
    ]);
    expect(group.label).toBe('Cubierta Alcalá');
  });

  it('leaves it unnamed when no member carries a place name', () => {
    const [group] = clusterInstallations([{ id: 'a', name: 'Batería', lat: 40.0, lng: -3.0 }]);
    expect(group.label).toBeNull();
  });
});
