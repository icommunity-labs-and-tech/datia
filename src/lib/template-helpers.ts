/**
 * Helpers para trabajar con templates de StatusType y Category
 */

/**
 * Extrae un campo de geolocalización de un templateConfig
 * @param templateConfig El objeto templateConfig del state
 * @returns Las coordenadas de geolocalización o null si no existe
 */
export function extractGeolocationField(
  templateConfig: any
): { lat: number; lng: number } | null {
  if (!templateConfig || typeof templateConfig !== 'object') {
    return null;
  }

  const geolocationField = Object.values(templateConfig).find(
    (value: any) =>
      value &&
      typeof value === 'object' &&
      'lat' in value &&
      'lng' in value &&
      typeof value.lat === 'number' &&
      typeof value.lng === 'number'
  ) as { lat: number; lng: number } | undefined;

  return geolocationField || null;
}

/**
 * Parsea un template que puede ser string JSON o array
 * @param template El template a parsear
 * @returns Array de campos del template
 */
export function parseTemplate(template: any): any[] {
  if (!template) {
    return [];
  }

  if (typeof template === 'string') {
    try {
      const parsed = JSON.parse(template);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(template) ? template : [];
}

/**
 * Genera un label legible desde un nombre de campo
 * @param name El nombre del campo (ej: "installedBy" -> "Installed By")
 * @returns Label formateado
 */
export function generateFieldLabel(name: string): string {
  if (!name) return '';
  
  return name
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

