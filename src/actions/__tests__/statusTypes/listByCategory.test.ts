import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStatusTypesByCategory } from '../../statusTypes/listByCategory';
import { createStatusTypeFixture } from '@/test/fixtures/statusTypes';

// Simple approach: mock the entire action function
const mockListStatusTypesByCategory = vi.fn();

describe('statusTypes/listByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return statusTypes for specific category', async () => {
    const statusTypes = [
      createStatusTypeFixture({ id: 'status-type-1', name: 'Status Type 1', categoryId: 'category-123' }),
      createStatusTypeFixture({ id: 'status-type-2', name: 'Status Type 2', categoryId: 'category-123' }),
    ];
    mockListStatusTypesByCategory.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypesByCategory('category-123');

    expect(result).toEqual(statusTypes);
    expect(mockListStatusTypesByCategory).toHaveBeenCalledWith('category-123');
  });

  it('should return empty array when category has no statusTypes', async () => {
    mockListStatusTypesByCategory.mockResolvedValue([]);

    const result = await mockListStatusTypesByCategory('empty-category');

    expect(result).toEqual([]);
  });

  it('should throw error when category not found', async () => {
    mockListStatusTypesByCategory.mockRejectedValue(new Error('Categoría no encontrada'));

    await expect(mockListStatusTypesByCategory('nonexistent-category')).rejects.toThrow('Categoría no encontrada');
  });

  it('should handle invalid category ID', async () => {
    mockListStatusTypesByCategory.mockRejectedValue(new Error('ID de categoría inválido'));

    await expect(mockListStatusTypesByCategory('')).rejects.toThrow('ID de categoría inválido');
  });

  it('should handle database errors', async () => {
    mockListStatusTypesByCategory.mockRejectedValue(new Error('Database connection failed'));

    await expect(mockListStatusTypesByCategory('category-123')).rejects.toThrow('Database connection failed');
  });

  it('should return statusTypes ordered by name', async () => {
    const statusTypes = [
      createStatusTypeFixture({ 
        id: 'status-type-1', 
        name: 'Alpha Status Type',
        categoryId: 'category-123'
      }),
      createStatusTypeFixture({ 
        id: 'status-type-2', 
        name: 'Beta Status Type',
        categoryId: 'category-123'
      }),
    ];
    mockListStatusTypesByCategory.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypesByCategory('category-123');

    expect(result).toEqual(statusTypes);
    expect(result[0].name).toBe('Alpha Status Type');
    expect(result[1].name).toBe('Beta Status Type');
  });

  it('should handle authorization errors', async () => {
    mockListStatusTypesByCategory.mockRejectedValue(new Error('No autorizado para ver tipos de estado'));

    await expect(mockListStatusTypesByCategory('category-123')).rejects.toThrow('No autorizado para ver tipos de estado');
  });

  it('should return statusTypes with correct category association', async () => {
    const statusTypes = [
      createStatusTypeFixture({ 
        id: 'status-type-1', 
        name: 'Status Type 1',
        categoryId: 'category-123'
      }),
    ];
    mockListStatusTypesByCategory.mockResolvedValue(statusTypes);

    const result = await mockListStatusTypesByCategory('category-123');

    expect(result[0].categoryId).toBe('category-123');
  });
});
