import { ItemRepository, DbError as ItemDbError } from './ItemRepository';

export interface ParsedItemRow {
  line: number;
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
}

export interface ImportItemRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
}

export interface ItemImportResult {
  createdCount: number;
}

export class ItemImportValidationError extends Error {
  readonly _tag = 'ItemImportValidationError';
  constructor(public readonly message: string, public readonly details: string[]) {
    super(message);
    this.name = 'ItemImportValidationError';
  }
}

export interface ItemImportService {
  importItemsFromParsedRows(
    organizationId: string,
    rows: ParsedItemRow[],
  ): Promise<ItemImportResult>;
}




