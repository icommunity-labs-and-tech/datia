import { CategoryInputError, CategoryAlreadyExistsError, CategoryNotFoundError, CategoryHasDependenciesError } from './errors';
import { CategoryRepository } from './CategoryRepository';

export interface CreateCategoryRequest {
  name: string;
  description: string;
  itemTemplate?: any;
}

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  itemTemplate?: any;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description: string;
  itemTemplate: any;
  createdAt: Date;
}

export interface CategoryDetailsResponse extends CategoryResponse {
  itemCount: number;
}

export interface CategoryCountResponse {
  categoryId: string;
  name: string;
  itemCount: number;
}

export interface CategoryService {
  createCategory(data: CreateCategoryRequest): Promise<CategoryResponse>;
  updateCategory(data: UpdateCategoryRequest): Promise<CategoryResponse>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<CategoryResponse>;
  listCategories(): Promise<CategoryResponse[]>;
  getCategoryDetails(id: string): Promise<CategoryDetailsResponse>;
  getCategoryItemCounts(): Promise<CategoryCountResponse[]>;
  findOrCreateCategory(name: string): Promise<CategoryResponse>;
  getAllCategories(): Promise<CategoryResponse[]>;
  searchCategories(query: string): Promise<CategoryResponse[]>;
  addCategoryToItem(itemId: string, categoryId: string): Promise<void>;
  removeCategoryFromItem(itemId: string, categoryId: string): Promise<void>;
  getItemCategories(itemId: string): Promise<CategoryResponse[]>;
}

export function createCategoryService(deps: {
  categoryRepository: CategoryRepository;
}): CategoryService {
  const { categoryRepository: repo } = deps;
  
  const toResponse = (c: any): CategoryResponse => ({
    id: c.id,
    name: c.name,
    description: c.description,
    itemTemplate: c.itemTemplate ?? [],
    createdAt: c.createdAt,
  });

  return {
    async createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
      // This will be implemented in the service implementation
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async updateCategory(data: UpdateCategoryRequest): Promise<CategoryResponse> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async deleteCategory(id: string): Promise<void> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async getCategory(id: string): Promise<CategoryResponse> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async listCategories(): Promise<CategoryResponse[]> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async getCategoryDetails(id: string): Promise<CategoryDetailsResponse> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async getCategoryItemCounts(): Promise<CategoryCountResponse[]> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async findOrCreateCategory(name: string): Promise<CategoryResponse> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async getAllCategories(): Promise<CategoryResponse[]> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async searchCategories(query: string): Promise<CategoryResponse[]> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async addCategoryToItem(itemId: string, categoryId: string): Promise<void> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async removeCategoryFromItem(itemId: string, categoryId: string): Promise<void> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
    async getItemCategories(itemId: string): Promise<CategoryResponse[]> {
      throw new Error('Not implemented - use categoryServiceImpl');
    },
  };
}
