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

/**
 * Format a date string to Spanish locale with time
 * Example: "3 feb 2026 · 14:30"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${dateStr} · ${timeStr}`;
}

/**
 * Format a date string with full details including time
 * Example: "3 de febrero de 2026, 14:30"
 */
export function formatFullDateTime(dateString?: string): string {
  if (!dateString) return 'No disponible';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
