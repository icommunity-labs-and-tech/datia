/**
 * Límites para la importación de items desde CSV
 * Estos límites están diseñados para evitar timeouts y problemas de rendimiento
 */

// Tamaño máximo del archivo CSV (20MB)
export const MAX_CSV_FILE_SIZE = 20 * 1024 * 1024; // 20MB en bytes

// Número máximo de filas permitidas en el CSV (500 filas)
export const MAX_CSV_ROWS = 500;

/**
 * Formatea el tamaño del archivo en MB para mostrar en mensajes de error
 */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Formatea el tamaño máximo permitido para mostrar en mensajes de error
 */
export function formatMaxFileSize(): string {
  return formatFileSize(MAX_CSV_FILE_SIZE);
}
