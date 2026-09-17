import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface CreateItemInput {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  itemTemplate?: any[];
  templateFields?: Record<string, any> | null;
  createdByUserId: string | null;
}

export interface ItemRecord {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  itemTemplate: any[];
  templateFields: Record<string, any> | null;
  evidenceID?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface ItemRepository {
  // Métodos con filtro por organización
  findByOrganization(organizationId: string): Promise<ItemRecord[]>;
  getById(id: string, organizationId: string): Promise<ItemRecord | null>;
  listForExport(organizationId: string, options: { fullPassport: boolean }): Promise<Array<{ id: string; name: string; description: string | null; createdAt: Date; categoryName: string | null; states: Array<{ id: string; title: string; backed: boolean | null; createdAt: Date }> }>>;
  create(input: CreateItemInput): Promise<ItemRecord>;
  updateEvidenceId(id: string, organizationId: string, evidenceID: string): Promise<void>;
  delete(id: string, organizationId: string): Promise<void>;
  getDetails(id: string, organizationId: string): Promise<
    | ({
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        states: Array<{ title: string }>;
        _count: { states: number };
      })
    | null
  >;
  listByCategory(categoryId: string, organizationId: string): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    itemTemplate: any[];
    templateFields: Record<string, any> | null;
    createdAt: Date;
  }>>;
  listByCategories(categoryIds: string[], organizationId: string): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    itemTemplate: any[];
    templateFields: Record<string, any> | null;
    createdAt: Date;
  }>>;
  addCategoriesToItem(itemId: string, categoryIds: string[], organizationId: string): Promise<void>;
  removeCategoriesFromItem(itemId: string, categoryIds: string[], organizationId: string): Promise<void>;
  getItemCategories(itemId: string, organizationId: string): Promise<Array<{ id: string; name: string }>>;
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
  getItemsWithStatesForBackup(organizationId: string, startDate: Date): Promise<Array<{
    id: string;
    name: string;
    states: Array<{ id: string; backed: boolean | null; createdAt: Date }>;
  }>>;
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
  listByCategoryPaginated(
    categoryId: string,
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
  findAll(): Promise<ItemRecord[]>;
}
