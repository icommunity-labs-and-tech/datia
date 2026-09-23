import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface CreateAssetInput {
  id: string;
  organizationId: string;
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
  // Métodos con filtro por organización
  findByOrganization(organizationId: string): Promise<AssetRecord[]>;
  getById(id: string, organizationId: string): Promise<AssetRecord | null>;
  listForExport(organizationId: string, options: { fullPassport: boolean }): Promise<Array<{
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
  updateEvidenceId(id: string, organizationId: string, evidenceId: string): Promise<void>;
  delete(id: string, organizationId: string): Promise<void>;
  getDetails(id: string, organizationId: string): Promise<
    | ({
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
      })
    | null
  >;
  search(query: string, organizationId: string): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }>>;
  countTotalItems(organizationId: string): Promise<number>;
  countActiveItems(organizationId: string, days: number): Promise<number>;
  countItemsByMonth(organizationId: string, startDate: Date, endDate: Date): Promise<number>;
  importMany(
    organizationId: string,
    rows: Array<{
      id: string;
      name: string;
      description: string | null;
      imageUrl?: string | null;
    }>
  ): Promise<void>;
  // Cursor-based pagination
  listPaginated(
    organizationId: string,
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
    organizationId: string,
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
