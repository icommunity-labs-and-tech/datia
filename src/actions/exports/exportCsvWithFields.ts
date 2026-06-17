'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { getDynamicAppUrl } from '@/lib/env';

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export type ExportFieldKey = 'id' | 'name' | 'description' | 'allCategories' | 'createdAt' | 'lastStateTitle' | 'lastStateDate' | 'customerUrl';

export async function exportItemsCsvWithFields(
  keys: Array<ExportFieldKey>,
  itemIds?: string[],
): Promise<{ filename: string; contentType: string; base64: string }> {
  const organizationId = await requireOrganizationId();
  let items = await itemRepository.listForExport(organizationId, { fullPassport: false });

  // Filtrar por itemIds si se proporcionan
  if (itemIds && itemIds.length > 0) {
    items = items.filter((it) => itemIds.includes(it.id));
  }

  // Get base URL once for customerUrl field
  const baseUrl = keys.includes('customerUrl') ? (await getDynamicAppUrl()).replace(/\/$/, '') : '';

  const headers = keys.map(k => k);
  const lines: string[] = [];
  lines.push(headers.join(','));
  for (const it of items) {
    const last = (it as any).states?.[0];
    const row = keys.map((k) => {
      switch (k) {
        case 'id': return toCsvValue(it.id);
        case 'name': return toCsvValue(it.name);
        case 'description': return toCsvValue(it.description ?? '');
        case 'allCategories': return toCsvValue(((it as any).categories ?? []).map((c: any) => c.name).join('; '));
        case 'createdAt': return toCsvValue(it.createdAt?.toISOString?.() ?? (it as any).createdAt);
        case 'lastStateTitle': return toCsvValue(last?.title ?? '');
        case 'lastStateDate': return toCsvValue(last?.createdAt?.toISOString?.() ?? last?.createdAt ?? '');
        case 'customerUrl': {
          return toCsvValue(`${baseUrl}/customer/item/${encodeURIComponent(it.id)}`);
        }
      }
    });
    lines.push(row.join(','));
  }

  const csv = lines.join('\n');
  const base64 = Buffer.from(csv, 'utf8').toString('base64');
  return {
    filename: 'items.csv',
    contentType: 'text/csv; charset=utf-8',
    base64,
  };
}

// type re-export not needed; exported inline above

