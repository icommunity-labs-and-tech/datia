import type { StatusTypeRecord } from '@/domain/status-types/StatusTypeRepository';

export const createStatusTypeFixture = (overrides: Partial<StatusTypeRecord> = {}): StatusTypeRecord => ({
  id: 'status-type-123',
  organizationId: 'org-test-123',
  name: 'Test Status Type',
  categoryId: 'category-123',
  fieldsSchema: { field1: 'string', field2: 'number' },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createStatusTypeWithSchemaFixture = (schema: Record<string, string>, overrides: Partial<StatusTypeRecord> = {}): StatusTypeRecord =>
  createStatusTypeFixture({
    fieldsSchema: schema,
    ...overrides,
  });

export const createStatusTypeWithoutSchemaFixture = (overrides: Partial<StatusTypeRecord> = {}): StatusTypeRecord =>
  createStatusTypeFixture({
    fieldsSchema: {},
    ...overrides,
  });

export const createStatusTypeListFixture = (count: number = 3): StatusTypeRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createStatusTypeFixture({
      id: `status-type-${i + 1}`,
      name: `Status Type ${i + 1}`,
    })
  );

export const createStatusTypeListByCategoryFixture = (categoryId: string, count: number = 3): StatusTypeRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createStatusTypeFixture({
      id: `status-type-${i + 1}`,
      name: `Status Type ${i + 1}`,
      categoryId,
    })
  );
