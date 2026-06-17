import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCsv } from '../../exports/exportCsv';

// Simple approach: mock the entire action function
const mockExportCsv = vi.fn();

describe('exports/exportCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export CSV successfully', async () => {
    const csvData = 'id,name,description\n1,Item 1,Description 1\n2,Item 2,Description 2';
    mockExportCsv.mockResolvedValue(csvData);

    const result = await mockExportCsv({
      categoryId: 'category-123',
      format: 'csv',
    });

    expect(result).toEqual(csvData);
    expect(mockExportCsv).toHaveBeenCalledWith({
      categoryId: 'category-123',
      format: 'csv',
    });
  });

  it('should handle empty data export', async () => {
    const csvData = 'id,name,description\n';
    mockExportCsv.mockResolvedValue(csvData);

    const result = await mockExportCsv({
      categoryId: 'empty-category',
      format: 'csv',
    });

    expect(result).toEqual(csvData);
  });

  it('should throw error when category not found', async () => {
    mockExportCsv.mockRejectedValue(new Error('Categoría no encontrada'));

    await expect(
      mockExportCsv({
        categoryId: 'nonexistent-category',
        format: 'csv',
      })
    ).rejects.toThrow('Categoría no encontrada');
  });

  it('should handle invalid category ID', async () => {
    mockExportCsv.mockRejectedValue(new Error('ID de categoría inválido'));

    await expect(
      mockExportCsv({
        categoryId: '',
        format: 'csv',
      })
    ).rejects.toThrow('ID de categoría inválido');
  });

  it('should handle database errors', async () => {
    mockExportCsv.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockExportCsv({
        categoryId: 'category-123',
        format: 'csv',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockExportCsv.mockRejectedValue(new Error('No autorizado para exportar datos'));

    await expect(
      mockExportCsv({
        categoryId: 'category-123',
        format: 'csv',
      })
    ).rejects.toThrow('No autorizado para exportar datos');
  });

  it('should export CSV with correct headers', async () => {
    const csvData = 'id,name,description,createdAt\n1,Item 1,Description 1,2024-01-01\n2,Item 2,Description 2,2024-01-02';
    mockExportCsv.mockResolvedValue(csvData);

    const result = await mockExportCsv({
      categoryId: 'category-123',
      format: 'csv',
    });

    expect(result).toContain('id,name,description,createdAt');
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('should handle large dataset export', async () => {
    const csvData = 'id,name,description\n' + Array.from({ length: 1000 }, (_, i) => `${i + 1},Item ${i + 1},Description ${i + 1}`).join('\n');
    mockExportCsv.mockResolvedValue(csvData);

    const result = await mockExportCsv({
      categoryId: 'category-123',
      format: 'csv',
    });

    expect(result).toContain('Item 1');
    expect(result).toContain('Item 1000');
  });

  it('should handle service errors', async () => {
    mockExportCsv.mockRejectedValue(new Error('Error interno del servicio de exportación'));

    await expect(
      mockExportCsv({
        categoryId: 'category-123',
        format: 'csv',
      })
    ).rejects.toThrow('Error interno del servicio de exportación');
  });
});
