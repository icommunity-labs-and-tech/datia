export const OPERATOR_CONSTANTS = {
  PAGE_SIZE: 12,
  MOBILE_BREAKPOINT: 768,
  DESCRIPTION_MAX_LENGTH: 50,
  SEARCH_FIELDS: ['name', 'categoryId', 'description'] as const,
} as const;

export const OPERATOR_MESSAGES = {
  LOADING_ITEMS: 'Cargando productos...',
  NO_ITEMS: 'No hay productos disponibles',
  NO_ITEMS_DESCRIPTION: 'Escanea un código QR para ver productos',
  SCAN_ERROR: 'Error de escaneo:',
  QR_EXTRACTION_ERROR: 'No se pudo extraer el ID del código QR',
  SCAN_ERROR_GENERIC: 'Error de escaneo',
  LOAD_MORE_MOBILE: 'Desliza para cargar más...',
} as const;

export const OPERATOR_BUTTONS = {
  NEW_ITEM: 'Nuevo Producto',
  START_SCAN: 'Iniciar Escaneo',
  STOP_SCAN: 'Detener Escaneo',
  LOGOUT: 'Cerrar Sesión',
  PREVIOUS: 'Anterior',
  NEXT: 'Siguiente',
} as const;
