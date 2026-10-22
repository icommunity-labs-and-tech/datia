#!/usr/bin/env node
/**
 * Builds src/lib/map/municipalities-es.json from the GeoNames dump for Spain.
 *
 *   curl -O https://download.geonames.org/export/dump/ES.zip && unzip ES.zip
 *   node scripts/gen-municipalities-es.mjs path/to/ES.txt
 *
 * GeoNames data, CC BY 4.0 (https://www.geonames.org). Spanish municipalities
 * are its ADM3 features and provinces its ADM2.
 */
import fs from 'node:fs';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/gen-municipalities-es.mjs path/to/ES.txt');
  process.exit(1);
}

const TARGET = 'src/lib/map/municipalities-es.json';

// GeoNames mixes languages in province names.
const PROVINCE_FIXES = { 'Provincia da Coruña': 'A Coruña' };
const provinceName = (raw) =>
  PROVINCE_FIXES[raw] ?? raw.replace(/^(Provincia de |Província de |Provincia da |Province of )/, '');

const rows = fs.readFileSync(source, 'utf8').split('\n').map((l) => l.split('\t'));

const provinces = new Map();
for (const r of rows) {
  if (r[7] === 'ADM2') provinces.set(`${r[10]}.${r[11]}`, provinceName(r[1]));
}

// A few municipalities carry an English or unaccented name instead of the one
// their own seat uses (found comparing ADM3 names with their PPLA/PPLA2 seats).
const NAME_FIXES = { Seville: 'Sevilla', Cordoba: 'Córdoba' };

// INE-style names postpose the article ("Campillo, El", "Pinós, el/Pinoso");
// shown the way people write them ("El Campillo", "El Pinós/Pinoso").
const ARTICLE = /^(.+), (La|El|Los|Las|A|O|Os|As|la|el|l'|les)(\/.*)?$/;
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
const naturalOrder = (name) => {
  const m = name.match(ARTICLE);
  // Some names already lead with a lowercase article ("l'Hospitalet de Llobregat").
  if (!m) return capitalize(name);
  const [, rest, article, alt = ''] = m;
  const cap = capitalize(article);
  return `${cap}${cap.endsWith("'") ? '' : ' '}${rest}${alt}`;
};

const round = (n) => Math.round(Number(n) * 1e3) / 1e3;

// Municipalities, keyed by their INE code (GeoNames admin3).
const municipalities = rows
  .filter((r) => r[7] === 'ADM3')
  .map((r) => ({
    code: r[12],
    name: naturalOrder(NAME_FIXES[r[1]] ?? r[1]),
    province: provinces.get(`${r[10]}.${r[11]}`) ?? null,
    lat: round(r[4]),
    lng: round(r[5]),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));
const index = new Map(municipalities.map((m, i) => [m.code, i]));

// Reference points: every populated place, tagged with its municipality. One
// point per municipality (its centroid) misplaces towns at the edge of a large
// term — Santa Cruz de Tenerife's centre landed in La Laguna — while thousands
// of settlements trace the boundaries closely. Municipalities with no populated
// place in GeoNames keep their centroid.
const points = [];
const covered = new Set();
for (const r of rows) {
  if (r[6] !== 'P' || !index.has(r[12])) continue;
  points.push(round(r[4]), round(r[5]), index.get(r[12]));
  covered.add(r[12]);
}
for (const m of municipalities) {
  if (!covered.has(m.code)) points.push(m.lat, m.lng, index.get(m.code));
}

const missing = municipalities.filter((m) => !m.province).length;
fs.writeFileSync(
  TARGET,
  JSON.stringify({
    source: 'GeoNames (https://www.geonames.org), CC BY 4.0',
    municipalities: municipalities.map((m) => [m.name, m.province]),
    // Flat [lat, lng, municipality index, ...] to keep the file small.
    points,
  }) + '\n'
);
console.log(
  `${municipalities.length} municipalities, ${points.length / 3} reference points → ${TARGET} (${missing} without province)`
);
