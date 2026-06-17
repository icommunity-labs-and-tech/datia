'use client';

export function extractItemIdFromQrData(raw: string): string | null {
  const data = (raw || '').trim();
  if (!data) return null;

  try {
    const url = new URL(data);
    const segments = url.pathname.split('/').filter(Boolean);
    
    // Buscar tanto 'items' como 'item' en la ruta
    const itemsIdx = segments.findIndex((s) => s.toLowerCase() === 'items');
    const itemIdx = segments.findIndex((s) => s.toLowerCase() === 'item');
    
    if (itemsIdx >= 0 && segments[itemsIdx + 1]) {
      return decodeURIComponent(segments[itemsIdx + 1]);
    }
    
    if (itemIdx >= 0 && segments[itemIdx + 1]) {
      return decodeURIComponent(segments[itemIdx + 1]);
    }
    
    const qp = url.searchParams.get('id') || url.searchParams.get('itemId');
    if (qp) return qp;
  } catch {}

  // Buscar tanto patrones 'items/' como 'item/' en el texto
  const itemsMatch = data.match(/items\/([^/?#]+)/i);
  if (itemsMatch && itemsMatch[1]) return decodeURIComponent(itemsMatch[1]);
  
  const itemMatch = data.match(/item\/([^/?#]+)/i);
  if (itemMatch && itemMatch[1]) return decodeURIComponent(itemMatch[1]);

  if (!/\s/.test(data)) return data;
  return null;
}


