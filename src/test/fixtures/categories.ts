import type { CategoryRecord } from '@/domain/categories/CategoryRepository';

export const createCategoryFixture = (overrides: Partial<CategoryRecord> = {}): CategoryRecord => ({
  id: 'category-123',
  organizationId: 'org-test-123',
  name: 'Test Category',
  itemTemplate: ['field1', 'field2'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createCategoryWithTemplateFixture = (template: string[], overrides: Partial<CategoryRecord> = {}): CategoryRecord =>
  createCategoryFixture({
    itemTemplate: template,
    ...overrides,
  });

export const createCategoryWithoutTemplateFixture = (overrides: Partial<CategoryRecord> = {}): CategoryRecord =>
  createCategoryFixture({
    itemTemplate: [],
    ...overrides,
  });

export const createCategoryListFixture = (count: number = 3): CategoryRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createCategoryFixture({
      id: `category-${i + 1}`,
      name: `Category ${i + 1}`,
    })
  );

export const createCategoryWithDetailsFixture = (overrides: Partial<CategoryRecord> = {}): CategoryRecord & {
  _count: { items: number; statusTypes: number };
  items: Array<{ id: string; name: string }>;
  statusTypes: Array<{ id: string; name: string }>;
} =>
  createCategoryFixture(overrides) as any;
