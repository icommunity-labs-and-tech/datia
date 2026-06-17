import { CategoryAlreadyExistsError, CategoryInputError, CategoryNotFoundError } from './errors';
import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface CategoryRecord {
  id: string;
  name: string;
  description: string;
  itemTemplate: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  organizationId: string;
  name: string;
  description: string;
  itemTemplate?: any[];
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  itemTemplate?: any[];
}

export class DbError extends Error {
  constructor(public readonly cause?: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface CategoryRepository {
  // Métodos con filtro por organización
  findByOrganization(organizationId: string): Promise<CategoryRecord[]>;
  getById(id: string, organizationId: string): Promise<CategoryRecord>;
  getByName(name: string, organizationId: string): Promise<CategoryRecord>;
  create(input: CreateCategoryInput): Promise<CategoryRecord>;
  update(id: string, organizationId: string, changes: UpdateCategoryInput): Promise<CategoryRecord>;
  delete(id: string, organizationId: string): Promise<void>;
  countItems(categoryId: string, organizationId: string): Promise<number>;
  listWithItemCounts(organizationId: string): Promise<Array<{ id: string; name: string; itemCount: number }>>;
  getCategoriesWithItemCounts(organizationId: string): Promise<Array<{
    id: string;
    name: string;
    items: Array<{ id: string }>;
    _count: { items: number };
  }>>;
  // Métodos para relación many-to-many con Items
  addCategoryToItem(itemId: string, categoryId: string, organizationId: string): Promise<void>;
  removeCategoryFromItem(itemId: string, categoryId: string, organizationId: string): Promise<void>;
  getItemCategories(itemId: string, organizationId: string): Promise<CategoryRecord[]>;
  getCategoryItems(categoryId: string, organizationId: string): Promise<Array<{ id: string; name: string }>>;
  searchCategories(query: string, organizationId: string): Promise<CategoryRecord[]>;
  // Cursor-based pagination
  listPaginated(
    organizationId: string,
    params: CursorPaginationParams
  ): Promise<CursorPaginationResult<CategoryRecord>>;
  // Para SUPER_ADMIN
  findAll(): Promise<CategoryRecord[]>;
}
