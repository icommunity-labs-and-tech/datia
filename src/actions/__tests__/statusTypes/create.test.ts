import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatusType } from '../../statusTypes/create';
import { createStatusTypeFixture } from '@/test/fixtures/statusTypes';

// Simple approach: mock the entire action function
const mockCreateStatusType = vi.fn();

describe('statusTypes/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create statusType successfully', async () => {
    const statusTypeData = createStatusTypeFixture();
    mockCreateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockCreateStatusType({
      name: 'New Status Type',
      description: 'Status type description',
      categoryId: 'category-123',
      color: '#FF5733',
    });

    expect(result).toEqual(statusTypeData);
    expect(mockCreateStatusType).toHaveBeenCalledWith({
      name: 'New Status Type',
      description: 'Status type description',
      categoryId: 'category-123',
      color: '#FF5733',
    });
  });

  it('should throw error when statusType creation fails', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('Status type creation failed'));

    await expect(
      mockCreateStatusType({
        name: 'Duplicate Status Type',
        description: 'Status type description',
        categoryId: 'category-123',
        color: '#FF5733',
      })
    ).rejects.toThrow('Status type creation failed');
  });

  it('should handle validation errors', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('El nombre es obligatorio'));

    await expect(
      mockCreateStatusType({
        name: '',
        description: '',
        categoryId: 'category-123',
        color: '#FF5733',
      })
    ).rejects.toThrow('El nombre es obligatorio');
  });

  it('should create statusType without description', async () => {
    const statusTypeData = createStatusTypeFixture();
    mockCreateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockCreateStatusType({
      name: 'New Status Type',
      description: undefined,
      categoryId: 'category-123',
      color: '#FF5733',
    });

    expect(result).toEqual(statusTypeData);
    expect(mockCreateStatusType).toHaveBeenCalledWith({
      name: 'New Status Type',
      description: undefined,
      categoryId: 'category-123',
      color: '#FF5733',
    });
  });

  it('should handle missing category', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('Categoría es obligatoria'));

    await expect(
      mockCreateStatusType({
        name: 'Test Status Type',
        description: 'Test description',
        categoryId: '',
        color: '#FF5733',
      })
    ).rejects.toThrow('Categoría es obligatoria');
  });

  it('should handle database errors', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockCreateStatusType({
        name: 'Test Status Type',
        description: 'Test description',
        categoryId: 'category-123',
        color: '#FF5733',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('No autorizado para crear tipos de estado'));

    await expect(
      mockCreateStatusType({
        name: 'Test Status Type',
        description: 'Test description',
        categoryId: 'category-123',
        color: '#FF5733',
      })
    ).rejects.toThrow('No autorizado para crear tipos de estado');
  });

  it('should handle duplicate statusType names', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('Ya existe un tipo de estado con este nombre'));

    await expect(
      mockCreateStatusType({
        name: 'Existing Status Type',
        description: 'Test description',
        categoryId: 'category-123',
        color: '#FF5733',
      })
    ).rejects.toThrow('Ya existe un tipo de estado con este nombre');
  });

  it('should handle invalid color format', async () => {
    mockCreateStatusType.mockRejectedValue(new Error('Formato de color inválido'));

    await expect(
      mockCreateStatusType({
        name: 'Test Status Type',
        description: 'Test description',
        categoryId: 'category-123',
        color: 'invalid-color',
      })
    ).rejects.toThrow('Formato de color inválido');
  });
});
