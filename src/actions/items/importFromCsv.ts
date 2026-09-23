'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { createItemImportServiceImpl } from '@/domain/items/ItemImportServiceImpl';
import { ItemImportValidationError, type ParsedItemRow } from '@/domain/items/ItemImportService';
import { parseCsv } from '@/lib/csv';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';

export interface ImportItemsFromCsvResult {
  success: boolean;
  createdCount?: number;
  errors?: string[];
}

export async function importItemsFromCsv(formData: FormData): Promise<ImportItemsFromCsvResult> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, errors: ['No se ha enviado ningún archivo'] };
  }

  const text = await file.text();
  if (!text.trim()) {
    return { success: false, errors: ['El archivo CSV está vacío'] };
  }

  const parsed = parseCsv(text);
  const rows: ParsedItemRow[] = parsed.map((row) => ({
    line: row.line,
    id: row.values['id']?.trim() ?? '',
    name: row.values['name']?.trim() ?? '',
    description: row.values['description']?.trim() || null,
    imageUrl: (row.values['imageUrl'] ?? '').trim() || null,
  }));

  try {
    const itemImportService = createItemImportServiceImpl({
      itemRepository,
    });
    const result = await itemImportService.importItemsFromParsedRows(await requireOrganizationId(), rows);
    return {
      success: true,
      createdCount: result.createdCount,
    };
  } catch (err: any) {
    if (err instanceof ItemImportValidationError) {
      return {
        success: false,
        errors: err.details.length ? err.details : [err.message],
      };
    }

    console.error('Error en importItemsFromCsv:', err);
    return {
      success: false,
      errors: ['Error interno al importar items desde CSV'],
    };
  }
}




