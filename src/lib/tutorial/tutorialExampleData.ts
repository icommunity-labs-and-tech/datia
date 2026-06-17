/**
 * Datos de ejemplo estáticos para el tutorial, organizados por sector.
 * Se muestran en las páginas de status-types e items durante el tour
 * para que el usuario vea un dashboard con contenido de ejemplo.
 */

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

export interface TutorialStatusType {
  id: string;
  name: string;
  description: string;
  template: Array<{ label: string; name: string; type: string; required?: boolean; options?: string[] }>;
  createdAt: string;
}

export interface TutorialItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  imageUrl: string | null;
  categories: Array<{ id: string; name: string }>;
  itemTemplate: Array<{ label: string; name: string; type: string }>;
  templateFields: Record<string, string | number>;
}

// ──────────────────────────────────────────────
// Fashion
// ──────────────────────────────────────────────

const fashionStatusTypes: TutorialStatusType[] = [
  {
    id: 'tutorial-st-1',
    name: 'Diseñado',
    description: 'Fase de diseño del producto. Se registra el diseñador, la colección y la temporada.',
    template: [
      { label: 'Diseñador', name: 'designer', type: 'text', required: true },
      { label: 'Colección', name: 'collection', type: 'text', required: true },
      { label: 'Temporada', name: 'season', type: 'select', options: ['Primavera/Verano', 'Otoño/Invierno'] },
      { label: 'Fecha diseño', name: 'designDate', type: 'date' },
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-2',
    name: 'Fabricado',
    description: 'Producto fabricado y listo para control de calidad. Se registra la fábrica y el lote.',
    template: [
      { label: 'Fábrica', name: 'factory', type: 'text', required: true },
      { label: 'Lote', name: 'batch', type: 'text', required: true },
      { label: 'Fecha fabricación', name: 'manufactureDate', type: 'date' },
      { label: 'Notas', name: 'notes', type: 'text' },
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-3',
    name: 'En almacén',
    description: 'Producto almacenado y disponible para distribución.',
    template: [
      { label: 'Almacén', name: 'warehouse', type: 'text', required: true },
      { label: 'Ubicación', name: 'location', type: 'text' },
      { label: 'Fecha entrada', name: 'entryDate', type: 'date' },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const fashionItems: TutorialItem[] = [
  {
    id: 'tutorial-item-1',
    name: 'Chaqueta de cuero premium',
    description: 'Chaqueta de cuero italiano con certificación de origen y trazabilidad completa',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-1', name: 'Prendas exteriores' }],
    itemTemplate: [
      { label: 'Material', name: 'material', type: 'text' },
      { label: 'Color', name: 'color', type: 'text' },
      { label: 'Talla', name: 'size', type: 'text' },
      { label: 'SKU', name: 'sku', type: 'text' },
    ],
    templateFields: { material: 'Cuero italiano', color: 'Negro', size: 'M', sku: 'JCK-LTH-001' },
  },
  {
    id: 'tutorial-item-2',
    name: 'Camiseta algodón orgánico',
    description: 'Camiseta fabricada con algodón 100% orgánico certificado',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-2', name: 'Camisetas' }],
    itemTemplate: [
      { label: 'Material', name: 'material', type: 'text' },
      { label: 'Color', name: 'color', type: 'text' },
      { label: 'Talla', name: 'size', type: 'text' },
      { label: 'SKU', name: 'sku', type: 'text' },
    ],
    templateFields: { material: 'Algodón orgánico', color: 'Blanco', size: 'L', sku: 'TSH-ORG-042' },
  },
  {
    id: 'tutorial-item-3',
    name: 'Bolso piel italiana',
    description: 'Bolso de mano fabricado artesanalmente en piel italiana',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-3', name: 'Accesorios' }],
    itemTemplate: [
      { label: 'Material', name: 'material', type: 'text' },
      { label: 'Color', name: 'color', type: 'text' },
      { label: 'Referencia', name: 'reference', type: 'text' },
    ],
    templateFields: { material: 'Piel italiana', color: 'Marrón', reference: 'BAG-ITA-015' },
  },
];

// ──────────────────────────────────────────────
// Batteries
// ──────────────────────────────────────────────

const batteriesStatusTypes: TutorialStatusType[] = [
  {
    id: 'tutorial-st-1',
    name: 'Fabricada',
    description: 'Batería fabricada y lista para pruebas. Se registra la línea de producción y el lote.',
    template: [
      { label: 'Línea de producción', name: 'productionLine', type: 'text', required: true },
      { label: 'Lote', name: 'batch', type: 'text', required: true },
      { label: 'Fecha fabricación', name: 'manufactureDate', type: 'date' },
      { label: 'Operario', name: 'operator', type: 'text' },
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-2',
    name: 'Testeada',
    description: 'Batería sometida a pruebas de rendimiento y seguridad.',
    template: [
      { label: 'Capacidad medida (Ah)', name: 'measuredCapacity', type: 'number', required: true },
      { label: 'Voltaje (V)', name: 'voltage', type: 'number', required: true },
      { label: 'Fecha test', name: 'testDate', type: 'date' },
      { label: 'Resultado', name: 'result', type: 'select', options: ['Aprobada', 'Rechazada'] },
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-3',
    name: 'Certificada',
    description: 'Batería certificada conforme a normativa vigente.',
    template: [
      { label: 'Certificado', name: 'certificate', type: 'text', required: true },
      { label: 'Norma', name: 'standard', type: 'text', required: true },
      { label: 'Fecha certificación', name: 'certDate', type: 'date' },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const batteriesItems: TutorialItem[] = [
  {
    id: 'tutorial-item-1',
    name: 'Batería Li-Ion 48V 100Ah',
    description: 'Batería de iones de litio de alta capacidad para almacenamiento energético',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-1', name: 'Baterías industriales' }],
    itemTemplate: [
      { label: 'Capacidad (Ah)', name: 'capacity', type: 'number' },
      { label: 'Voltaje (V)', name: 'voltage', type: 'number' },
      { label: 'Química', name: 'chemistry', type: 'text' },
      { label: 'N° Serie', name: 'serialNumber', type: 'text' },
    ],
    templateFields: { capacity: 100, voltage: 48, chemistry: 'Li-Ion NMC', serialNumber: 'BAT-48V-00142' },
  },
  {
    id: 'tutorial-item-2',
    name: 'Celda 18650 3500mAh',
    description: 'Celda cilíndrica formato 18650 para ensamblaje de packs',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-2', name: 'Celdas' }],
    itemTemplate: [
      { label: 'Capacidad (mAh)', name: 'capacity', type: 'number' },
      { label: 'Voltaje nominal (V)', name: 'voltage', type: 'number' },
      { label: 'Peso (g)', name: 'weight', type: 'number' },
      { label: 'N° Serie', name: 'serialNumber', type: 'text' },
    ],
    templateFields: { capacity: 3500, voltage: 3.7, weight: 48, serialNumber: 'CELL-18650-08721' },
  },
  {
    id: 'tutorial-item-3',
    name: 'Pack solar 12V 200Ah',
    description: 'Pack de baterías para instalación solar residencial',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-3', name: 'Packs solares' }],
    itemTemplate: [
      { label: 'Capacidad (Ah)', name: 'capacity', type: 'number' },
      { label: 'Voltaje (V)', name: 'voltage', type: 'number' },
      { label: 'Peso (kg)', name: 'weight', type: 'number' },
      { label: 'N° Serie', name: 'serialNumber', type: 'text' },
    ],
    templateFields: { capacity: 200, voltage: 12, weight: 25, serialNumber: 'SOL-12V-00033' },
  },
];

// ──────────────────────────────────────────────
// Construction Materials
// ──────────────────────────────────────────────

const constructionStatusTypes: TutorialStatusType[] = [
  {
    id: 'tutorial-st-1',
    name: 'Producido',
    description: 'Material producido en planta. Se registra la planta de producción y el lote.',
    template: [
      { label: 'Planta', name: 'plant', type: 'text', required: true },
      { label: 'Lote', name: 'batch', type: 'text', required: true },
      { label: 'Fecha producción', name: 'productionDate', type: 'date' },
      { label: 'Responsable', name: 'responsible', type: 'text' },
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-2',
    name: 'Control de calidad',
    description: 'Material sometido a ensayos y control de calidad.',
    template: [
      { label: 'Inspector', name: 'inspector', type: 'text', required: true },
      { label: 'Resultado ensayo', name: 'testResult', type: 'select', options: ['Conforme', 'No conforme'] },
      { label: 'Fecha inspección', name: 'inspectionDate', type: 'date' },
      { label: 'Observaciones', name: 'observations', type: 'text' },
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tutorial-st-3',
    name: 'Certificado',
    description: 'Material certificado conforme a normativa de construcción.',
    template: [
      { label: 'Norma', name: 'standard', type: 'text', required: true },
      { label: 'N° Certificado', name: 'certificateNumber', type: 'text', required: true },
      { label: 'Fecha certificación', name: 'certDate', type: 'date' },
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const constructionItems: TutorialItem[] = [
  {
    id: 'tutorial-item-1',
    name: 'Cemento Portland CEM I 42.5R',
    description: 'Cemento Portland de alta resistencia inicial para estructuras',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-1', name: 'Cementos' }],
    itemTemplate: [
      { label: 'Tipo', name: 'type', type: 'text' },
      { label: 'Peso (kg)', name: 'weight', type: 'number' },
      { label: 'Resistencia (MPa)', name: 'resistance', type: 'number' },
      { label: 'N° Lote', name: 'batchNumber', type: 'text' },
    ],
    templateFields: { type: 'CEM I 42.5R', weight: 25, resistance: 42.5, batchNumber: 'CEM-2025-00891' },
  },
  {
    id: 'tutorial-item-2',
    name: 'Bloque hormigón 40x20x20',
    description: 'Bloque de hormigón para muros de carga',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-2', name: 'Bloques' }],
    itemTemplate: [
      { label: 'Dimensiones', name: 'dimensions', type: 'text' },
      { label: 'Resistencia (MPa)', name: 'resistance', type: 'number' },
      { label: 'Peso (kg)', name: 'weight', type: 'number' },
      { label: 'N° Lote', name: 'batchNumber', type: 'text' },
    ],
    templateFields: { dimensions: '40x20x20 cm', resistance: 8, weight: 18, batchNumber: 'BLQ-2025-04522' },
  },
  {
    id: 'tutorial-item-3',
    name: 'Viga de acero HEB 200',
    description: 'Viga de acero laminado para estructura metálica',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: null,
    categories: [{ id: 'tutorial-cat-3', name: 'Acero estructural' }],
    itemTemplate: [
      { label: 'Perfil', name: 'profile', type: 'text' },
      { label: 'Longitud (m)', name: 'length', type: 'number' },
      { label: 'Peso (kg/m)', name: 'weightPerMeter', type: 'number' },
      { label: 'N° Colada', name: 'heatNumber', type: 'text' },
    ],
    templateFields: { profile: 'HEB 200', length: 6, weightPerMeter: 61.3, heatNumber: 'ACE-2025-01234' },
  },
];

// ──────────────────────────────────────────────
// Mapa por sector slug
// ──────────────────────────────────────────────

const statusTypesBySector: Record<string, TutorialStatusType[]> = {
  fashion: fashionStatusTypes,
  batteries: batteriesStatusTypes,
  construction_materials: constructionStatusTypes,
};

const itemsBySector: Record<string, TutorialItem[]> = {
  fashion: fashionItems,
  batteries: batteriesItems,
  construction_materials: constructionItems,
};

/**
 * Devuelve los tipos de estado de ejemplo para el sector dado.
 * Si el sector no existe, devuelve los de fashion como fallback.
 */
export function getTutorialStatusTypes(sectorSlug: string): TutorialStatusType[] {
  return statusTypesBySector[sectorSlug] ?? fashionStatusTypes;
}

/**
 * Devuelve los items de ejemplo para el sector dado.
 * Si el sector no existe, devuelve los de fashion como fallback.
 */
export function getTutorialItems(sectorSlug: string): TutorialItem[] {
  return itemsBySector[sectorSlug] ?? fashionItems;
}
