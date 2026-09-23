import { ItemImportService, type ParsedItemRow, type ItemImportResult, ItemImportValidationError, type ImportItemRow } from './ItemImportService';
import type { ItemRepository } from './ItemRepository';

export function createItemImportServiceImpl(deps: {
  itemRepository: ItemRepository;
}): ItemImportService {
  const { itemRepository: itemRepo } = deps;

  return {
    async importItemsFromParsedRows(organizationId: string, rows: ParsedItemRow[]): Promise<ItemImportResult> {
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
        throw new ItemImportValidationError(
          'Errores de validación en las filas del CSV',
          errors
        );
      }

      // Check for existing items
      const existingConflicts: string[] = [];
      for (const row of rows) {
        try {
          await itemRepo.getById(row.id, organizationId);
          existingConflicts.push(`Línea ${row.line}: id "${row.id}" ya existe en la base de datos`);
        } catch {
          // Item doesn't exist, continue
        }
      }

      if (existingConflicts.length > 0) {
        throw new ItemImportValidationError(
          'Se encontraron ids ya existentes; no se importó ningún item',
          existingConflicts
        );
      }

      // Build import rows
      const importRows: ImportItemRow[] = rows.map((r) => ({
        id: r.id.trim(),
        name: r.name.trim(),
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
      }));

      await itemRepo.importMany(organizationId, importRows);

      return { createdCount: importRows.length };
    },
  };
}
