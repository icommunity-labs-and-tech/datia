#!/usr/bin/env node
/**
 * Rebuilds the demo catalogue: a coherent portfolio of solar installations
 * spread over five Spanish sites, with the lifecycle history, energy sources,
 * consumption series and emission records that hang off each asset.
 *
 * It replaces every Item of the organisation — deleting an Item cascades to its
 * states, category links, energy sources, consumptions and emissions — and then
 * seeds the new portfolio. Categories and status types are left untouched: the
 * script reuses the ones already defined.
 *
 * Data is fabricated, but internally consistent: serial numbers, dates, powers,
 * emission factors and verification bodies all line up with the asset they
 * describe.
 *
 * Run with: node scripts/seed-demo-catalogue.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const ORG_SLUG = 'datia';

/** Evidence identifiers mimic the ones iBS returns, so the UI renders as in production. */
const itemEvidence = () => `evd_${randomBytes(16).toString('base64url').slice(0, 22)}`;
const stateEvidence = () => `evd_${randomBytes(12).toString('hex')}`;

const at = (iso) => new Date(iso);

/**
 * Assets at one site sit metres apart, not kilometres. Spreading them slightly
 * keeps their markers from stacking into one unreadable pin, while staying well
 * inside the radius that groups them into the same installation.
 */
function scatter(site, seed) {
  const angle = (seed * 137.508 * Math.PI) / 180; // golden angle, spreads evenly
  const radius = 0.0004 + (seed % 5) * 0.00025;   // ~40–150 m
  return {
    lat: parseFloat((site.lat + Math.cos(angle) * radius).toFixed(6)),
    lng: parseFloat((site.lng + Math.sin(angle) * radius * 1.3).toFixed(6)),
  };
}

/**
 * Deterministic identifiers derived from the serial number, so re-seeding keeps
 * the same URLs and anything pointing at an asset (the capture spec, a printed
 * QR) survives a rebuild.
 */
function stableId(seed) {
  const h = createHash('sha1').update(`datia:${seed}`).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), `5${h.slice(13, 16)}`,
          ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
          h.slice(20, 32)].join('-');
}

// ── Sites ────────────────────────────────────────────────────────────────────
const SITES = {
  almaraz:   { label: 'Planta FV Almaraz II · Cáceres',        lat: 39.8028, lng: -5.6969 },
  ejea:      { label: 'Parque FV Ejea de los Caballeros · Zaragoza', lat: 42.1268, lng: -1.1381 },
  alcala:    { label: 'Cubierta industrial Alcalá · Madrid',   lat: 40.4818, lng: -3.3644 },
  paterna:   { label: 'Autoconsumo Nave Paterna · Valencia',   lat: 39.5030, lng: -0.4410 },
  granadilla:{ label: 'Microrred Puerto Real · Cádiz',         lat: 36.5286, lng: -6.1900 },
  almacen:   { label: 'Almacén central · Getafe',              lat: 40.3083, lng: -3.7325 },
};

// ── Portfolio ────────────────────────────────────────────────────────────────
// `life` picks the lifecycle template; `installed` anchors the history in time.
const ASSETS = [
  // Paneles solares
  { cat: 'Paneles Solares', name: 'Canadian Solar HiKu7 CS7N-605MS · 605 W', serial: 'CS7N-24-0412', site: 'almaraz', installed: '2025-03-18', life: 'full', vendor: 'Distribuidora Solar Ibérica',
    desc: 'Módulo monocristalino PERC de 605 W, 132 medias células, marco de aluminio anodizado. Instalado en el sector A del campo fotovoltaico.' },
  { cat: 'Paneles Solares', name: 'Jinko Tiger Neo N-type 620 W', serial: 'JKM-24-1187', site: 'almaraz', installed: '2025-03-21', life: 'servicio', vendor: 'Distribuidora Solar Ibérica',
    desc: 'Módulo de tecnología TOPCon tipo N, 620 W, con menor degradación anual y mejor comportamiento a alta temperatura.' },
  { cat: 'Paneles Solares', name: 'LONGi Hi-MO 6 LR5-72HTH · 580 W', serial: 'LR5-25-0903', site: 'ejea', installed: '2025-05-09', life: 'servicio', vendor: 'Solaria Componentes',
    desc: 'Módulo Hi-MO 6 con célula HPBC, 580 W, orientado a instalaciones de gran superficie.' },
  { cat: 'Paneles Solares', name: 'Trina Vertex S+ TSM-445NEG9R.28 · 445 W', serial: 'TSM-25-2210', site: 'alcala', installed: '2025-06-02', life: 'servicio', vendor: 'Solaria Componentes',
    desc: 'Módulo de vidrio-vidrio bifacial de 445 W, formato reducido para cubierta industrial.' },
  { cat: 'Paneles Solares', name: 'JA Solar DeepBlue 4.0 JAM72D40 · 610 W', serial: 'JAM-25-0771', site: 'ejea', installed: '2025-05-14', life: 'mantenimiento', vendor: 'Distribuidora Solar Ibérica',
    desc: 'Módulo bifacial n-type de 610 W con garantía lineal de potencia a 30 años.' },
  { cat: 'Paneles Solares', name: 'Q CELLS Q.PEAK DUO ML-G11S · 480 W', serial: 'QC-24-3355', site: 'paterna', installed: '2024-11-27', life: 'incidencia', vendor: 'Levante Renovables',
    desc: 'Módulo Q.ANTUM DUO Z de 480 W. Retirado temporalmente tras detectarse microfisuras en la inspección termográfica.' },
  { cat: 'Paneles Solares', name: 'Risen Titan RSM110-8-550M · 550 W', serial: 'RSM-25-1902', site: 'granadilla', installed: '2025-07-30', life: 'reciente', vendor: 'Atlántico Solar',
    desc: 'Módulo de 550 W con tratamiento antisalino, seleccionado por la proximidad del emplazamiento a la costa.' },

  // Inversores
  { cat: 'Inversores', name: 'Huawei SUN2000-100KTL-M2 · 100 kW', serial: 'HW-100K-24-0055', site: 'almaraz', installed: '2025-03-10', life: 'full', vendor: 'Huawei Iberia',
    desc: 'Inversor trifásico de string de 100 kW con 10 MPPT, monitorización por optimizador y detección de arco eléctrico.' },
  { cat: 'Inversores', name: 'SMA Sunny Tripower CORE1 STP 62-US · 62 kW', serial: 'SMA-62-25-0311', site: 'ejea', installed: '2025-05-02', life: 'servicio', vendor: 'SMA Ibérica',
    desc: 'Inversor de instalación libre con seis entradas MPPT, pensado para montaje sin estructura adicional.' },
  { cat: 'Inversores', name: 'Fronius Tauro ECO 100-3-D · 100 kW', serial: 'FR-TAU-25-0142', site: 'alcala', installed: '2025-05-28', life: 'mantenimiento', vendor: 'Fronius España',
    desc: 'Inversor de proyecto con refrigeración activa por conductos, apto para ambientes con polvo en suspensión.' },
  { cat: 'Inversores', name: 'Ingeteam INGECON SUN 3Play 100TL · 100 kW', serial: 'ING-100-24-0908', site: 'granadilla', installed: '2025-07-22', life: 'reciente', vendor: 'Ingeteam',
    desc: 'Inversor trifásico sin transformador con función de gestión de microrred y arranque en isla.' },
  { cat: 'Inversores', name: 'Sungrow SG110CX · 110 kW', serial: 'SG-110-25-0467', site: 'paterna', installed: '2024-12-04', life: 'servicio', vendor: 'Levante Renovables',
    desc: 'Inversor de string de 110 kW con nueve MPPT y protección frente a sobretensiones tipo II integrada.' },
  { cat: 'Inversores', name: 'GoodWe GW50K-MT · 50 kW', serial: 'GW-50-24-1120', site: 'alcala', installed: '2025-06-11', life: 'servicio', vendor: 'Solaria Componentes',
    desc: 'Inversor de 50 kW para la ampliación de la cubierta, con control de inyección cero a red.' },

  // Baterías solares
  { cat: 'Baterías Solares', name: 'BYD Battery-Box Premium HVM 22.1 kWh', serial: 'BYD-HVM-25-0233', site: 'paterna', installed: '2025-01-16', life: 'full', vendor: 'Levante Renovables',
    desc: 'Sistema de almacenamiento modular de alta tensión, 22,1 kWh útiles en ocho módulos LFP.' },
  { cat: 'Baterías Solares', name: 'Huawei LUNA2000-15-S0 · 15 kWh', serial: 'LUNA-24-0811', site: 'alcala', installed: '2025-06-18', life: 'servicio', vendor: 'Huawei Iberia',
    desc: 'Batería LFP de 15 kWh con optimizador por módulo y capacidad de ampliación en caliente.' },
  { cat: 'Baterías Solares', name: 'Pylontech Force H2 · 14,2 kWh', serial: 'PYL-H2-25-0396', site: 'granadilla', installed: '2025-08-05', life: 'reciente', vendor: 'Atlántico Solar',
    desc: 'Torre de almacenamiento de alta tensión de 14,2 kWh, integrada en el bus de continua de la microrred.' },
  { cat: 'Baterías Solares', name: 'Sungrow SBR192 · 19,2 kWh', serial: 'SBR-25-0158', site: 'ejea', installed: '2025-05-20', life: 'servicio', vendor: 'SMA Ibérica',
    desc: 'Sistema de baterías LFP de 19,2 kWh en configuración de seis módulos SBR096.' },

  // Baterías
  { cat: 'Baterías', name: 'EVE LiFePO4 12 V 280 Ah con BMS Bluetooth', serial: 'EVE-280-25-0642', site: 'almacen', installed: null, life: 'almacen', vendor: 'Distribuidora Solar Ibérica',
    img: 'https://storage.googleapis.com/datia-imgs/uploads/item/bateria-lifepo4-12v-280ah-bluetooth.webp',
    desc: 'Batería de fosfato de hierro y litio de 12 V y 280 Ah, con BMS integrado y seguimiento por Bluetooth. En almacén, pendiente de asignación a proyecto.' },
  { cat: 'Baterías', name: 'CATL LFP 100 Ah · módulo de repuesto', serial: 'CATL-100-24-0517', site: 'almacen', installed: null, life: 'almacen', vendor: 'Distribuidora Solar Ibérica',
    desc: 'Módulo LFP de 100 Ah reservado como repuesto para las torres de almacenamiento de Paterna.' },

  // Accesorios solares
  { cat: 'Accesorios Solares', name: 'Wallbox Commander 2 · 22 kW', serial: 'WBC-22-25-0729', site: 'alcala', installed: '2025-06-25', life: 'servicio', vendor: 'Wallbox',
    desc: 'Cargador trifásico de 22 kW con pantalla táctil, gestión de carga dinámica y lector RFID.' },
  { cat: 'Accesorios Solares', name: 'K2 Systems Dome 6 · estructura coplanar', serial: 'K2-D6-25-1180', site: 'almaraz', installed: '2025-03-05', life: 'servicio', vendor: 'K2 Systems',
    desc: 'Sistema de montaje este-oeste sin penetración para cubierta plana, con lastre calculado por zona de viento.' },
  { cat: 'Accesorios Solares', name: 'Tigo TS4-A-O · optimizador de módulo', serial: 'TIGO-24-2043', site: 'paterna', installed: '2024-12-10', life: 'mantenimiento', vendor: 'Levante Renovables',
    desc: 'Optimizador de módulo con desconexión rápida y monitorización individual, montado sobre el marco del panel.' },

  // UPS
  { cat: 'UPS', name: 'Eaton 9PX 6000i RT3U · 6 kVA', serial: 'EAT-9PX-24-0288', site: 'alcala', installed: '2025-02-13', life: 'servicio', vendor: 'Eaton Iberia',
    desc: 'SAI de doble conversión de 6 kVA en formato rack, con tarjeta de red y baterías calientes sustituibles.' },
  { cat: 'UPS', name: 'Riello Sentinel Dual SDU 10000 · 10 kVA', serial: 'RIE-SDU-25-0074', site: 'granadilla', installed: '2025-07-18', life: 'reciente', vendor: 'Atlántico Solar',
    desc: 'SAI de 10 kVA que sostiene la instrumentación de la microrred durante las transiciones a modo isla.' },
];

/**
 * Lifecycle templates. Each entry produces one state; `offset` is days from the
 * installation date, so every history stays ordered and plausible.
 */
const LIFECYCLES = {
  full:          ['recibida', 'inspeccionada', 'instalacion', 'servicio', 'mantenimiento', 'mantenimiento2'],
  servicio:      ['recibida', 'inspeccionada', 'instalacion', 'servicio'],
  mantenimiento: ['recibida', 'inspeccionada', 'instalacion', 'servicio', 'mantenimiento'],
  incidencia:    ['recibida', 'inspeccionada', 'instalacion', 'servicio', 'incidencia', 'retirada'],
  reciente:      ['recibida', 'inspeccionada', 'instalacion'],
  almacen:       ['recibida', 'inspeccionada'],
};

const STEP = {
  recibida:      { type: 'Recibida',          title: 'Recepción en almacén',        offset: -22 },
  inspeccionada: { type: 'Inspeccionada',     title: 'Inspección de entrada',       offset: -15 },
  instalacion:   { type: 'Instalación',       title: 'Instalación en planta',       offset: 0 },
  servicio:      { type: 'En servicio',       title: 'Puesta en servicio',          offset: 4 },
  mantenimiento: { type: 'Mantenimiento',     title: 'Mantenimiento preventivo',    offset: 120 },
  mantenimiento2:{ type: 'Mantenimiento',     title: 'Revisión semestral',          offset: 240 },
  incidencia:    { type: 'Incidencia/Fallo',  title: 'Incidencia detectada',        offset: 180 },
  retirada:      { type: 'Retirada temporal', title: 'Retirada temporal a taller',  offset: 195 },
};

const VENDOR_DOC = (serial) => `ALB-${serial.split('-').slice(-2).join('')}`;

/** Fills a state's template with values that match its status type. */
function templateFor(step, asset, site, when) {
  const iso = when.toISOString().slice(0, 10);
  switch (step) {
    case 'recibida':
      return { vendor: asset.vendor, batchOrSerial: asset.serial, receivedAt: iso,
        visualState: 'Embalaje íntegro, sin daños aparentes', documentRef: VENDOR_DOC(asset.serial),
        notes: 'Contrastado contra albarán y registrado en el catálogo.' };
    case 'inspeccionada':
      return { restVoltage: asset.cat.includes('Bater') ? 13.2 : 41.6, temperature: 21.4,
        soh: 100, inspectionResult: 'Apto para instalación',
        notes: 'Inspección visual y eléctrica sin incidencias.' };
    case 'instalacion':
      return { installedBy: 'Equipo de montaje · Datia', installedAt: iso, location: site.label };
    case 'servicio':
      return { soh: 100, soc: 92, cycles: 0, nominalCurrent: 18.4, nominalVoltage: 400,
        operatingTemp: 34.8, notes: 'Unidad operativa, telemetría reportando con normalidad.' };
    case 'mantenimiento':
      return { performedBy: 'Servicio técnico · Datia', maintenanceAt: iso,
        notes: 'Revisión de conexiones, limpieza y actualización de firmware. Sin desviaciones.' };
    case 'mantenimiento2':
      return { performedBy: 'Servicio técnico · Datia', maintenanceAt: iso,
        notes: 'Revisión semestral: par de apriete verificado y curva I-V dentro de tolerancia.' };
    case 'incidencia':
      return { eventType: 'Pérdida de rendimiento', timestamp: iso,
        readings: 'Potencia de salida 78 % de la esperada en condiciones equivalentes',
        bmsCode: 'PV-ARR-014', notes: 'Termografía revela microfisuras en tres células.' };
    case 'retirada':
      return { reason: 'Sustitución en garantía', date: iso, owner: 'Servicio técnico · Datia',
        ubicacion: { lat: site.lat, lng: site.lng } };
    default:
      return {};
  }
}

// ── Energy sources ───────────────────────────────────────────────────────────
// Each source hangs off the asset that physically embodies it.
const SOURCES = [
  { serial: 'HW-100K-24-0055',  name: 'Campo FV Almaraz II — sector A', tech: 'photovoltaic', kw: 2400, site: 'almaraz',   renew: 100, go: 'GO-ES-2025-004182', factor: 0.041 },
  { serial: 'SMA-62-25-0311',   name: 'Parque FV Ejea — línea 1',       tech: 'photovoltaic', kw: 1800, site: 'ejea',      renew: 100, go: 'GO-ES-2025-004907', factor: 0.041 },
  { serial: 'FR-TAU-25-0142',   name: 'Cubierta FV Alcalá',             tech: 'photovoltaic', kw: 620,  site: 'alcala',    renew: 100, go: 'GO-ES-2025-005311', factor: 0.041 },
  { serial: 'ING-100-24-0908',  name: 'Microrred FV Puerto Real',        tech: 'photovoltaic', kw: 450,  site: 'granadilla',renew: 100, go: 'GO-ES-2025-005648', factor: 0.041 },
  { serial: 'SG-110-25-0467',   name: 'Autoconsumo FV Paterna',         tech: 'photovoltaic', kw: 320,  site: 'paterna',   renew: 100, go: 'GO-ES-2025-003960', factor: 0.041 },
  { serial: 'GW-50-24-1120',    name: 'Cubierta FV Alcalá — ampliación',tech: 'photovoltaic', kw: 180,  site: 'alcala',    renew: 100, go: 'GO-ES-2025-005312', factor: 0.041 },
  { serial: 'BYD-HVM-25-0233',  name: 'Almacenamiento Paterna',         tech: 'battery_storage', kw: 22, site: 'paterna',  renew: 100, go: null, factor: 0.041 },
  { serial: 'SBR-25-0158',      name: 'Almacenamiento Ejea',            tech: 'battery_storage', kw: 19, site: 'ejea',     renew: 100, go: null, factor: 0.041 },
  { serial: 'EAT-9PX-24-0288',  name: 'Red eléctrica — suministro Alcalá',     tech: 'grid', kw: null, site: 'alcala',     renew: 22, go: null, factor: 0.233 },
  { serial: 'RIE-SDU-25-0074',  name: 'Red eléctrica — suministro Puerto Real', tech: 'grid', kw: null, site: 'granadilla', renew: 22, go: null, factor: 0.233 },
];

/** Relative solar yield by month, so the series follows a believable season. */
const SEASON = [0.42, 0.55, 0.78, 0.92, 1.08, 1.20, 1.24, 1.14, 0.94, 0.68, 0.47, 0.38];

const VERIFIERS = ['AENOR', 'Bureau Veritas', 'TÜV Rheinland', 'SGS'];

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`No existe la organización "${ORG_SLUG}"`);

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });

  const cats = await prisma.category.findMany({ where: { organizationId: org.id } });
  const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  const types = await prisma.statusType.findMany({ where: { organizationId: org.id } });
  const typeId = Object.fromEntries(types.map((t) => [t.name, t.id]));

  for (const a of ASSETS) {
    if (!catId[a.cat]) throw new Error(`Falta la categoría "${a.cat}"`);
  }
  for (const s of Object.values(STEP)) {
    if (!typeId[s.type]) throw new Error(`Falta el tipo de estado "${s.type}"`);
  }

  // ── Wipe ───────────────────────────────────────────────────────────────────
  const before = await prisma.item.count({ where: { organizationId: org.id } });
  const { count: removed } = await prisma.item.deleteMany({ where: { organizationId: org.id } });
  console.log(`  borrados ${removed}/${before} items (con su cascada)`);

  // ── Assets ─────────────────────────────────────────────────────────────────
  const idBySerial = {};
  let stateCount = 0;

  for (const [index, a] of ASSETS.entries()) {
    const site = SITES[a.site];
    const id = stableId(a.serial);
    idBySerial[a.serial] = id;

    const anchor = a.installed ? at(a.installed) : at('2025-09-12');
    const created = new Date(anchor.getTime() - 25 * 864e5);

    await prisma.item.create({
      data: {
        id,
        name: `${a.name} · ${a.serial}`,
        description: a.desc,
        imageUrl: a.img ?? null,
        organizationId: org.id,
        createdByUserId: admin?.id ?? null,
        evidenceID: itemEvidence(),
        createdAt: created,
        updatedAt: created,
        itemTemplate: [],
        // Position lives in the category's template, which is where the map
        // reads it from to group assets into installations.
        templateFields: { ubicacion: scatter(site, index + 1) },
      },
    });
    await prisma.itemCategory.create({ data: { itemId: id, categoryId: catId[a.cat] } });

    const steps = LIFECYCLES[a.life];
    for (const [i, step] of steps.entries()) {
      const cfg = STEP[step];
      const when = new Date(anchor.getTime() + cfg.offset * 864e5);
      // The most recent state of an in-service asset is still settling on chain:
      // the interface must be able to show confirmed and pending side by side.
      const pending = i === steps.length - 1 && ['full', 'mantenimiento'].includes(a.life);
      await prisma.state.create({
        data: {
          id: stableId(`${a.serial}:${step}`),
          itemId: id,
          statusTypeId: typeId[cfg.type],
          title: cfg.title,
          description: `${cfg.title} — ${a.name}`,
          // A pending state has no evidence yet: the real flow writes
          // 'pending' until iBS answers. Inventing an `evd_` id here made the
          // confirmation sweep retry a reference iBS rejects with 400, forever.
          evidenceID: pending ? 'pending' : stateEvidence(),
          backed: !pending,
          backedAt: pending ? null : new Date(when.getTime() + 42 * 60000),
          templateConfig: templateFor(step, a, site, when),
          createdAt: when,
          createdByUserId: admin?.id ?? null,
        },
      });
      stateCount++;
    }
  }
  console.log(`  creados ${ASSETS.length} activos · ${stateCount} estados`);

  // ── Energy chain ───────────────────────────────────────────────────────────
  let consCount = 0;
  let emCount = 0;

  for (const s of SOURCES) {
    const site = SITES[s.site];
    const itemId = idBySerial[s.serial];
    if (!itemId) throw new Error(`La fuente "${s.name}" apunta a un activo inexistente`);

    const source = await prisma.energySource.create({
      data: {
        name: s.name,
        energyCarrier: 'ELECTRICITY',
        generationTechnology: s.tech,
        capacityKw: s.kw,
        location: site.label,
        latitude: site.lat,
        longitude: site.lng,
        installationDate: at('2025-03-01'),
        renewableShare: s.renew,
        guaranteeOfOriginId: s.go,
        countryOfOrigin: 'ES',
        gridEmissionFactor: s.factor,
        itemId,
      },
    });

    // Twelve closed months, ending with the month before the capture date.
    for (let m = 0; m < 12; m++) {
      const start = new Date(Date.UTC(2025, 8 + m, 1));
      const end = new Date(Date.UTC(2025, 9 + m, 0, 23, 59, 59));
      const base = s.kw ? s.kw * 3.2 : 4200;
      const kwh = Math.round(base * SEASON[start.getUTCMonth()] * (0.94 + Math.random() * 0.12));

      const consumption = await prisma.energyConsumption.create({
        data: {
          energySourceId: source.id,
          periodStart: start,
          periodEnd: end,
          consumptionKwh: kwh,
          consumptionMj: Math.round(kwh * 3.6),
          lifecycleStage: 'USE',
          measurementStandard: s.tech === 'grid' ? 'ISO 50001' : 'IEC 61724-1',
          operatingConditions: { site: site.label, technology: s.tech },
          createdAt: end,
        },
      });
      consCount++;

      const verified = Math.random() > 0.2;
      await prisma.emissionRecord.create({
        data: {
          energyConsumptionId: consumption.id,
          co2eKg: Math.round(kwh * s.factor * 100) / 100,
          scope: s.tech === 'grid' ? 'SCOPE_2' : 'SCOPE_3',
          systemBoundary: s.tech === 'grid' ? 'CRADLE_TO_GATE' : 'CRADLE_TO_GRAVE',
          emissionFactor: s.factor,
          emissionFactorSource: s.tech === 'grid' ? 'REE · Mix eléctrico peninsular' : 'IPCC AR6 · ciclo de vida fotovoltaico',
          calculationMethodology: 'ISO 14067',
          gwpCharacterizationFactors: 'IPCC AR6',
          functionalUnit: '1 kWh entregado',
          verificationStatus: verified ? 'VERIFIED' : 'PENDING',
          verifierBody: verified ? VERIFIERS[m % VERIFIERS.length] : null,
          verificationStandard: verified ? 'ISO 14064-3' : null,
          createdAt: end,
        },
      });
      emCount++;
    }
  }
  console.log(`  creadas ${SOURCES.length} fuentes · ${consCount} consumos · ${emCount} emisiones`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
