#!/usr/bin/env node
/**
 * Gives assets a position of their own.
 *
 * Geolocation exists in Datia only as a template field type, and the templates
 * that used it put it on the withdrawal status types — so an asset got
 * coordinates when it was retired and never before. The result was that 23 of 24
 * assets had no position at all, and the map could only plot energy sources.
 *
 * This adds a geolocation field to the item template of every category in use,
 * and fills it for the existing catalogue from the site each asset belongs to.
 * No schema change: it uses the same user-defined template mechanism the product
 * already has.
 *
 * Idempotent: a category that already declares the field is left alone, and an
 * asset that already has coordinates keeps them.
 *
 * Run with: node scripts/add-item-geolocation.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const ORG_SLUG = 'datia';

/** Matches the shape the interface already renders and edits. */
const GEO_FIELD = {
  name: 'ubicacion',
  type: 'geolocation',
  label: 'Ubicación',
  required: false,
};

/**
 * Where each asset of the seeded catalogue sits. Keyed by the serial in the
 * asset name, so the mapping survives a re-seed.
 */
const SITES = {
  almaraz:    { label: 'Planta FV Almaraz II · Cáceres',              lat: 39.8028, lng: -5.6969 },
  ejea:       { label: 'Parque FV Ejea de los Caballeros · Zaragoza', lat: 42.1268, lng: -1.1381 },
  alcala:     { label: 'Cubierta industrial Alcalá · Madrid',         lat: 40.4818, lng: -3.3644 },
  paterna:    { label: 'Autoconsumo Nave Paterna · Valencia',         lat: 39.5030, lng: -0.4410 },
  puertoreal: { label: 'Microrred Puerto Real · Cádiz',               lat: 36.5286, lng: -6.1900 },
  almacen:    { label: 'Almacén central · Getafe',                    lat: 40.3083, lng: -3.7325 },
};

const ASSET_SITE = {
  'CS7N-24-0412': 'almaraz',   'JKM-24-1187': 'almaraz',
  'HW-100K-24-0055': 'almaraz','K2-D6-25-1180': 'almaraz',
  'LR5-25-0903': 'ejea',       'JAM-25-0771': 'ejea',
  'SMA-62-25-0311': 'ejea',    'SBR-25-0158': 'ejea',
  'TSM-25-2210': 'alcala',     'FR-TAU-25-0142': 'alcala',
  'GW-50-24-1120': 'alcala',   'LUNA-24-0811': 'alcala',
  'WBC-22-25-0729': 'alcala',  'EAT-9PX-24-0288': 'alcala',
  'QC-24-3355': 'paterna',     'SG-110-25-0467': 'paterna',
  'BYD-HVM-25-0233': 'paterna','TIGO-24-2043': 'paterna',
  'RSM-25-1902': 'puertoreal', 'ING-100-24-0908': 'puertoreal',
  'PYL-H2-25-0396': 'puertoreal','RIE-SDU-25-0074': 'puertoreal',
  'EVE-280-25-0642': 'almacen','CATL-100-24-0517': 'almacen',
};

/**
 * Assets at one site are metres apart, not kilometres. Spreading them slightly
 * keeps their markers from stacking into a single unreadable pin, while staying
 * well inside the radius that groups them into the same installation.
 */
function scatter(site, seed) {
  const angle = (seed * 137.508 * Math.PI) / 180; // golden angle, spreads evenly
  const radius = 0.0004 + (seed % 5) * 0.00025;   // ~40–150 m
  return {
    lat: parseFloat((site.lat + Math.cos(angle) * radius).toFixed(6)),
    lng: parseFloat((site.lng + Math.sin(angle) * radius * 1.3).toFixed(6)),
  };
}

const hasGeoField = (template) =>
  (Array.isArray(template) ? template : []).some((f) => f?.type === 'geolocation');

const isGeoValue = (v) =>
  !!v && typeof v === 'object' && typeof v.lat === 'number' && typeof v.lng === 'number';

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`No existe la organización "${ORG_SLUG}"`);

  // ── Categories in use ─────────────────────────────────────────────────────
  const categories = await prisma.category.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, itemTemplate: true, _count: { select: { ItemCategory: true } } },
  });

  let touched = 0;
  for (const c of categories.filter((c) => c._count.ItemCategory > 0)) {
    if (hasGeoField(c.itemTemplate)) {
      console.log(`  = ${c.name} — ya declaraba geolocalización`);
      continue;
    }
    const template = [...(Array.isArray(c.itemTemplate) ? c.itemTemplate : []), GEO_FIELD];
    await prisma.category.update({
      where: { id: c.id },
      data: { itemTemplate: template, updatedAt: new Date() },
    });
    console.log(`  + ${c.name} — campo de geolocalización añadido`);
    touched++;
  }

  // ── Existing assets ───────────────────────────────────────────────────────
  const items = await prisma.item.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, templateFields: true },
    orderBy: { name: 'asc' },
  });

  let located = 0;
  let kept = 0;
  const unknown = [];

  for (const [index, item] of items.entries()) {
    const fields = (item.templateFields ?? {});
    if (isGeoValue(fields[GEO_FIELD.name])) {
      kept++;
      continue;
    }

    const serial = Object.keys(ASSET_SITE).find((s) => item.name.includes(s));
    if (!serial) {
      unknown.push(item.name);
      continue;
    }

    const site = SITES[ASSET_SITE[serial]];
    await prisma.item.update({
      where: { id: item.id },
      data: {
        templateFields: { ...fields, [GEO_FIELD.name]: scatter(site, index + 1) },
        updatedAt: new Date(),
      },
    });
    located++;
  }

  console.log(`\n  categorías actualizadas : ${touched}`);
  console.log(`  activos ubicados        : ${located}`);
  console.log(`  ya tenían coordenadas   : ${kept}`);
  if (unknown.length) {
    console.log(`  sin emplazamiento conocido (${unknown.length}):`);
    for (const n of unknown) console.log(`    ${n.slice(0, 70)}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
