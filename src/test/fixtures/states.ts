import type { StateRecord } from '@/domain/states/StateRepository';

export const createStateFixture = (overrides: Partial<StateRecord> = {}): StateRecord => ({
  id: 'state-123',
  organizationId: 'org-test-123',
  title: 'Test State',
  description: 'Test state description',
  statusTypeId: 'status-type-123',
  itemId: 'item-123',
  imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  evidenceID: 'evidence-123',
  backed: true,
  createdByUserId: 'user-123',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createStateWithImagesFixture = (imageUrls: string[], overrides: Partial<StateRecord> = {}): StateRecord =>
  createStateFixture({
    imageUrls,
    ...overrides,
  });

export const createStateWithoutImagesFixture = (overrides: Partial<StateRecord> = {}): StateRecord =>
  createStateFixture({
    imageUrls: [],
    ...overrides,
  });

export const createBackedStateFixture = (overrides: Partial<StateRecord> = {}): StateRecord =>
  createStateFixture({
    backed: true,
    ...overrides,
  });

export const createPendingStateFixture = (overrides: Partial<StateRecord> = {}): StateRecord =>
  createStateFixture({
    backed: false,
    ...overrides,
  });

export const createStateListFixture = (count: number = 3): StateRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createStateFixture({
      id: `state-${i + 1}`,
      title: `State ${i + 1}`,
      description: `Description for state ${i + 1}`,
    })
  );

export const createStateListByItemFixture = (itemId: string, count: number = 3): StateRecord[] =>
  Array.from({ length: count }, (_, i) =>
    createStateFixture({
      id: `state-${i + 1}`,
      title: `State ${i + 1}`,
      itemId,
    })
  );
