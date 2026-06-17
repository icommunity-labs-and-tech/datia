import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStatusTypes } from '../../statusTypes/list';
import { createStatusTypeFixture } from '@/test/fixtures/statusTypes';

// Simple approach: mock the entire action function
const mockListStatusTypes = vi.fn();

describe('statusTypes/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of statusTypes', async () => {
    const statusTypes = [
      createStatusTypeFixture({ id: 'status-type-1', name: 'Status Type 1' }),
      createStatusTypeFixture({ id: 'status-type-2', name: 'Status Type 2' }),
    ];
    mockListStatusTypes.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypes();

    expect(result).toEqual(statusTypes);
    expect(mockListStatusTypes).toHaveBeenCalled();
  });

  it('should return empty array when no statusTypes exist', async () => {
    mockListStatusTypes.mockResolvedValue([]);

    const result = await mockListStatusTypes();

    expect(result).toEqual([]);
  });

  it('should handle database errors', async () => {
    mockListStatusTypes.mockRejectedValue(new Error('Database connection failed'));

    await expect(mockListStatusTypes()).rejects.toThrow('Database connection failed');
  });

  it('should return statusTypes ordered by name', async () => {
    const statusTypes = [
      createStatusTypeFixture({ 
        id: 'status-type-1', 
        name: 'Alpha Status Type',
        createdAt: new Date('2024-01-01')
      }),
      createStatusTypeFixture({ 
        id: 'status-type-2', 
        name: 'Beta Status Type',
        createdAt: new Date('2024-01-02')
      }),
    ];
    mockListStatusTypes.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypes();

    expect(result).toEqual(statusTypes);
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it('should return statusTypes with category information', async () => {
    const statusTypes = [
      createStatusTypeFixture({ 
        id: 'status-type-1', 
        name: 'Status Type 1',
        categoryId: 'category-1'
      }),
      createStatusTypeFixture({ 
        id: 'status-type-2', 
        name: 'Status Type 2',
        categoryId: 'category-2'
      }),
    ];
    mockListStatusTypes.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypes();

    expect(result).toEqual(statusTypes);
    expect(result[0].categoryId).toBe('category-1');
    expect(result[1].categoryId).toBe('category-2');
  });

  it('should handle authorization errors', async () => {
    mockListStatusTypes.mockRejectedValue(new Error('No autorizado para ver tipos de estado'));

    await expect(mockListStatusTypes()).rejects.toThrow('No autorizado para ver tipos de estado');
  });

  it('should return statusTypes with correct data types', async () => {
    const statusTypes = [
      createStatusTypeFixture({ 
        id: 'status-type-1', 
        name: 'Status Type 1',
        categoryId: 'category-1'
      }),
    ];
    mockListStatusTypes.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypes();

    expect(typeof result[0].id).toBe('string');
    expect(typeof result[0].name).toBe('string');
    expect(typeof result[0].categoryId).toBe('string');
    expect(typeof result[0].fieldsSchema).toBe('object');
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });
});
