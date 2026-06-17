import type { ItemRecord } from '@/domain/items/ItemRepository';

export const createItemFixture = (overrides: Partial<ItemRecord> = {}): ItemRecord => ({
  id: 'item-123',
  organizationId: 'org-test-123',
  name: 'Test Item',
  description: 'Test item description',
  categoryId: 'category-123',
  imageUrl: 'https://example.com/image.jpg',
  itemTemplate: ['field1', 'field2'],
  templateFields: { field1: 'value1', field2: 'value2' },
  evidenceID: 'evidence-123',
  createdByUserId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createItemWithTemplateFixture = (template: string[], fields: Record<string, any>, overrides: Partial<ItemRecord> = {}): ItemRecord =>
  createItemFixture({
    itemTemplate: template,
    templateFields: fields,
    ...overrides,
  });

export const createItemWithoutTemplateFixture = (overrides: Partial<ItemRecord> = {}): ItemRecord =>
  createItemFixture({
    itemTemplate: [],
    templateFields: {},
    ...overrides,
  });

export const createItemListFixture = (count: number = 3): ItemRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createItemFixture({
      id: `item-${i + 1}`,
      name: `Item ${i + 1}`,
      description: `Description for item ${i + 1}`,
    })
  );

export const createItemWithStatesFixture = (stateCount: number = 2, overrides: Partial<ItemRecord> = {}): ItemRecord =>
  createItemFixture({
    ...overrides,
    // Note: states would be populated via relations in actual implementation
  });
