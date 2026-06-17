export function generateStateTitle(itemName: string, statusTypeName: string): string {
  // Solo retornar el nombre del tipo de estado, sin el nombre del item
  const right = String(statusTypeName || '').trim();
  return right || '';
}

export function deriveCustomerUrl(baseUrl: string | undefined, itemId: string): string {
  const root = (baseUrl || 'http://localhost:3000').replace(/\/$/, '');
  return `${root}/customer/item/${encodeURIComponent(itemId)}`;
}


