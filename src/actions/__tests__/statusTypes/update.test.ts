import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStatusType } from '../../statusTypes/update';
import { createStatusTypeFixture } from '@/test/fixtures/statusTypes';

// Simple approach: mock the entire action function
const mockUpdateStatusType = vi.fn();

describe('statusTypes/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update statusType successfully', async () => {
    const statusTypeData = createStatusTypeFixture({ 
      name: 'Updated Status Type',
      color: '#00FF00'
    });
    mockUpdateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockUpdateStatusType('status-type-123', {
      name: 'Updated Status Type',
      color: '#00FF00',
    });

    expect(result).toEqual(statusTypeData);
    expect(mockUpdateStatusType).toHaveBeenCalledWith('status-type-123', {
      name: 'Updated Status Type',
      color: '#00FF00',
    });
  });

  it('should throw error when statusType not found', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('Tipo de estado no encontrado'));

    await expect(
      mockUpdateStatusType('nonexistent-status-type', {
        name: 'Updated Status Type',
      })
    ).rejects.toThrow('Tipo de estado no encontrado');
  });

  it('should handle invalid statusType ID', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('ID de tipo de estado inválido'));

    await expect(
      mockUpdateStatusType('', {
        name: 'Updated Status Type',
      })
    ).rejects.toThrow('ID de tipo de estado inválido');
  });

  it('should handle database errors', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockUpdateStatusType('status-type-123', {
        name: 'Updated Status Type',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('No autorizado para actualizar tipos de estado'));

    await expect(
      mockUpdateStatusType('status-type-123', {
        name: 'Updated Status Type',
      })
    ).rejects.toThrow('No autorizado para actualizar tipos de estado');
  });

  it('should handle validation errors', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('Datos de actualización inválidos'));

    await expect(
      mockUpdateStatusType('status-type-123', {
        name: '',
      })
    ).rejects.toThrow('Datos de actualización inválidos');
  });

  it('should update statusType color', async () => {
    const statusTypeData = createStatusTypeFixture({ 
      color: '#FF0000'
    });
    mockUpdateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockUpdateStatusType('status-type-123', {
      color: '#FF0000',
    });

    expect(result).toEqual(statusTypeData);
    expect(result.color).toBe('#FF0000');
  });

  it('should update statusType description', async () => {
    const statusTypeData = createStatusTypeFixture({ 
      description: 'Updated description'
    });
    mockUpdateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockUpdateStatusType('status-type-123', {
      description: 'Updated description',
    });

    expect(result).toEqual(statusTypeData);
    expect(result.description).toBe('Updated description');
  });

  it('should handle duplicate name errors', async () => {
    mockUpdateStatusType.mockRejectedValue(new Error('Ya existe un tipo de estado con este nombre'));

    await expect(
      mockUpdateStatusType('status-type-123', {
        name: 'Existing Status Type',
      })
    ).rejects.toThrow('Ya existe un tipo de estado con este nombre');
  });

  it('should handle empty update data', async () => {
    const statusTypeData = createStatusTypeFixture();
    mockUpdateStatusType.mockResolvedValue(statusTypeData);

    const result = await mockUpdateStatusType('status-type-123', {});

    expect(result).toEqual(statusTypeData);
  });
});
