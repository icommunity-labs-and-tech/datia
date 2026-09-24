import { AssetImportService, type ParsedAssetRow, type AssetImportResult, AssetImportValidationError, type ImportAssetRow } from './AssetImportService';
import type { AssetRepository } from './AssetRepository';
import type { Scope } from '@/lib/scope';

export function createAssetImportServiceImpl(deps: {
  assetRepository: AssetRepository;
}): AssetImportService {
  const { assetRepository: itemRepo } = deps;

  return {
    async importAssetsFromParsedRows(scope: Scope, rows: ParsedAssetRow[]): Promise<AssetImportResult> {
      if (!rows.length) {
        return { createdCount: 0 };
      }

      const errors: string[] = [];

      // Validate IDs
      const ids = rows.map((r) => r.id.trim());
      const seen = new Set<string>();
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const line = rows[i].line;
        if (!id) {
          errors.push(`Línea ${line}: id vacío`);
        } else if (seen.has(id)) {
          errors.push(`Línea ${line}: id duplicado "${id}" en el propio CSV`);
        }
        seen.add(id);
      }

      // Validate required fields
      for (const row of rows) {
        if (!row.name?.trim()) {
          errors.push(`Línea ${row.line}: name vacío`);
        }
      }

      if (errors.length > 0) {
        throw new AssetImportValidationError(
          'Errores de validación en las filas del CSV',
          errors
        );
      }

      // Check for existing activos
      const existingConflicts: string[] = [];
      for (const row of rows) {
        try {
          await itemRepo.getById(row.id, scope);
          existingConflicts.push(`Línea ${row.line}: id "${row.id}" ya existe en la base de datos`);
        } catch {
          // Item doesn't exist, continue
        }
      }

      if (existingConflicts.length > 0) {
        throw new AssetImportValidationError(
          'Se encontraron ids ya existentes; no se importó ningún item',
          existingConflicts
        );
      }

      // Build import rows
      const importRows: ImportAssetRow[] = rows.map((r) => ({
        id: r.id.trim(),
        name: r.name.trim(),
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
      }));

      await itemRepo.importMany(scope, importRows);

      return { createdCount: importRows.length };
    },
  };
}
