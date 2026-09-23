import { AssetRepository, DbError as ItemDbError } from './AssetRepository';

export interface ParsedAssetRow {
  line: number;
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
}

export interface ImportAssetRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
}

export interface AssetImportResult {
  createdCount: number;
}

export class AssetImportValidationError extends Error {
  readonly _tag = 'AssetImportValidationError';
  constructor(public readonly message: string, public readonly details: string[]) {
    super(message);
    this.name = 'AssetImportValidationError';
  }
}

export interface AssetImportService {
  importAssetsFromParsedRows(
    organizationId: string,
    rows: ParsedAssetRow[],
  ): Promise<AssetImportResult>;
}




