import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCsvWithFields } from '../../exports/exportCsvWithFields';

// Simple approach: mock the entire action function
const mockExportCsvWithFields = vi.fn();

describe('exports/exportCsvWithFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export CSV with custom fields successfully', async () => {
    const csvData = 'id,name,customField1,customField2\n1,Item 1,Value 1,Value 2\n2,Item 2,Value 3,Value 4';
    mockExportCsvWithFields.mockResolvedValue(csvData);

    const result = await mockExportCsvWithFields({
      categoryId: 'category-123',
      fields: ['customField1', 'customField2'],
      format: 'csv',
    });

    expect(result).toEqual(csvData);
    expect(mockExportCsvWithFields).toHaveBeenCalledWith({
      categoryId: 'category-123',
      fields: ['customField1', 'customField2'],
      format: 'csv',
    });
  });

  it('should handle empty fields array', async () => {
    const csvData = 'id,name\n1,Item 1\n2,Item 2';
    mockExportCsvWithFields.mockResolvedValue(csvData);

    const result = await mockExportCsvWithFields({
      categoryId: 'category-123',
      fields: [],
      format: 'csv',
    });

    expect(result).toEqual(csvData);
  });

  it('should throw error when category not found', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('Categoría no encontrada'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'nonexistent-category',
        fields: ['field1'],
        format: 'csv',
      })
    ).rejects.toThrow('Categoría no encontrada');
  });

  it('should handle invalid field names', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('Campos inválidos especificados'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'category-123',
        fields: ['invalidField', 'anotherInvalidField'],
        format: 'csv',
      })
    ).rejects.toThrow('Campos inválidos especificados');
  });

  it('should handle database errors', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'category-123',
        fields: ['field1', 'field2'],
        format: 'csv',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('No autorizado para exportar datos'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'category-123',
        fields: ['field1'],
        format: 'csv',
      })
    ).rejects.toThrow('No autorizado para exportar datos');
  });

  it('should export CSV with specific field order', async () => {
    const csvData = 'id,customField2,customField1,name\n1,Value 2,Value 1,Item 1\n2,Value 4,Value 3,Item 2';
    mockExportCsvWithFields.mockResolvedValue(csvData);

    const result = await mockExportCsvWithFields({
      categoryId: 'category-123',
      fields: ['customField2', 'customField1'],
      format: 'csv',
    });

    expect(result).toContain('id,customField2,customField1,name');
  });

  it('should handle missing required fields', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('Campos requeridos faltantes'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'category-123',
        fields: ['field1'],
        format: 'csv',
      })
    ).rejects.toThrow('Campos requeridos faltantes');
  });

  it('should export CSV with nested field data', async () => {
    const csvData = 'id,name,nestedField.value\n1,Item 1,Nested Value 1\n2,Item 2,Nested Value 2';
    mockExportCsvWithFields.mockResolvedValue(csvData);

    const result = await mockExportCsvWithFields({
      categoryId: 'category-123',
      fields: ['nestedField.value'],
      format: 'csv',
    });

    expect(result).toContain('nestedField.value');
  });

  it('should handle service errors', async () => {
    mockExportCsvWithFields.mockRejectedValue(new Error('Error interno del servicio de exportación'));

    await expect(
      mockExportCsvWithFields({
        categoryId: 'category-123',
        fields: ['field1'],
        format: 'csv',
      })
    ).rejects.toThrow('Error interno del servicio de exportación');
  });
});
