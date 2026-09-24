import type { Scope } from '@/lib/scope';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface CreateAssetInput {
  id: string;
  scope: Scope;
  name: string;
  description: string;
  imageUrl?: string | null;
  createdByUserId: string | null;
  /** Where the asset is, in its own columns since #37. */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AssetRecord {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  evidenceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface AssetRepository {
  // Métodos con filtro por alcance (organización y, si la hay, empresa)
  findByOrganization(scope: Scope): Promise<AssetRecord[]>;
  getById(id: string, scope: Scope): Promise<AssetRecord | null>;
  listForExport(scope: Scope, options: { fullPassport: boolean }): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    siteName: string | null;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
  }>>;
  create(input: CreateAssetInput): Promise<AssetRecord>;
  updateEvidenceId(id: string, scope: Scope, evidenceId: string): Promise<void>;
  delete(id: string, scope: Scope): Promise<void>;
  getDetails(id: string, scope: Scope): Promise<
    | ({
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
      })
    | null
  >;
  search(query: string, scope: Scope): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }>>;
  countTotalItems(scope: Scope): Promise<number>;
  countActiveItems(scope: Scope, days: number): Promise<number>;
  countItemsByMonth(scope: Scope, startDate: Date, endDate: Date): Promise<number>;
  importMany(
    scope: Scope,
    rows: Array<{
      id: string;
      name: string;
      description: string | null;
      imageUrl?: string | null;
    }>
  ): Promise<void>;
  // Cursor-based pagination
  listPaginated(
    scope: Scope,
    params: CursorPaginationParams
  ): Promise<CursorPaginationResult<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }>>;
  searchPaginated(
    query: string,
    scope: Scope,
    params: CursorPaginationParams
  ): Promise<CursorPaginationResult<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }>>;
  // Para SUPER_ADMIN
}
