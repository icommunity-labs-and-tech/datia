/**
 * Format a date string to Spanish locale (date only)
 * Example: "3 de febrero de 2026"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
