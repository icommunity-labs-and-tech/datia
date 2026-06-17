export default function formatValue(value: unknown, locale: string = 'es'): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    const localeString = locale === 'en' ? 'en-US' : 'es-ES';
    return value.toLocaleString(localeString, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? (locale === 'en' ? 'Yes' : 'Sí') : (locale === 'en' ? 'No' : 'No');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function formatCompactDate(date: Date | string, locale: string = 'es'): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return String(date); // Return original value as string if invalid date
  }

  const localeString = locale === 'en' ? 'en-US' : 'es-ES';
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString(localeString, { month: 'long' });
  const hour = dateObj.getHours().toString().padStart(2, '0');
  const minute = dateObj.getMinutes().toString().padStart(2, '0');

  if (locale === 'en') {
    return `${month} ${day} at ${hour}:${minute}`;
  }
  return `${day} ${month} a las ${hour}:${minute}`;
}

export function formatValueWithSmartDateDetection(value: unknown, fieldName?: string, locale: string = 'es'): string {
  // Check if this is a date field (by name or content)
  const isDateField = fieldName && (
    fieldName.toLowerCase().includes('date') || 
    fieldName.toLowerCase().includes('created') || 
    fieldName.toLowerCase().includes('updated')
  );
  
  const isDateContent = typeof value === 'string' && value.includes('GMT');
  
  if (isDateField || isDateContent) {
    return formatCompactDate(value as Date | string, locale);
  }
  
  return formatValue(value, locale);
}

export function truncateText(text: string, maxLength: number = 12): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}
