'use server';

import { requireScope } from '@/lib/auth/tenant';
import { createAssetImportServiceImpl } from '@/domain/assets/AssetImportServiceImpl';
import { AssetImportValidationError, type ParsedAssetRow } from '@/domain/assets/AssetImportService';
import { parseCsv } from '@/lib/csv';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';

export interface ImportItemsFromCsvResult {
  success: boolean;
  createdCount?: number;
  errors?: string[];
}

export async function importAssetsFromCsv(formData: FormData): Promise<ImportItemsFromCsvResult> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, errors: ['No se ha enviado ningún archivo'] };
  }

  const text = await file.text();
  if (!text.trim()) {
    return { success: false, errors: ['El archivo CSV está vacío'] };
  }

  const parsed = parseCsv(text);
  const rows: ParsedAssetRow[] = parsed.map((row) => ({
    line: row.line,
    id: row.values['id']?.trim() ?? '',
    name: row.values['name']?.trim() ?? '',
    description: row.values['description']?.trim() || null,
    imageUrl: (row.values['imageUrl'] ?? '').trim() || null,
  }));

  try {
    const itemImportService = createAssetImportServiceImpl({
      assetRepository,
    });
    const result = await itemImportService.importAssetsFromParsedRows(await requireScope(), rows);
    return {
      success: true,
      createdCount: result.createdCount,
    };
  } catch (err: any) {
    if (err instanceof AssetImportValidationError) {
      return {
        success: false,
        errors: err.details.length ? err.details : [err.message],
      };
    }

    console.error('Error en importAssetsFromCsv:', err);
    return {
      success: false,
      errors: ['Error interno al importar activos desde CSV'],
    };
  }
}




