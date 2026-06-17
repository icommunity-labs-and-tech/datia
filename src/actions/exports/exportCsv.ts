'use server';

import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function exportItemsCsv(): Promise<{ filename: string; contentType: string; base64: string }> {
  const organizationId = await requireOrganizationId();
  const items = await itemRepository.listForExport(organizationId, { fullPassport: false });

  const headers = ['id', 'name', 'description', 'categoryName', 'createdAt'];
  const lines: string[] = [];
  lines.push(headers.join(','));
  for (const it of items as any[]) {
    const row = [
      toCsvValue(it.id),
      toCsvValue(it.name),
      toCsvValue(it.description ?? ''),
      toCsvValue(it.categoryName ?? ''),
      toCsvValue(it.createdAt?.toISOString?.() ?? (it as any).createdAt),
    ];
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

