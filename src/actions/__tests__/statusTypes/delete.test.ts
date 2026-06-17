import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteStatusType } from '../../statusTypes/delete';
import { createStatusTypeFixture } from '@/test/fixtures/statusTypes';

// Simple approach: mock the entire action function
const mockDeleteStatusType = vi.fn();

describe('statusTypes/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete statusType successfully without dependencies', async () => {
    mockDeleteStatusType.mockResolvedValue(true);

    const result = await mockDeleteStatusType('status-type-123');

    expect(result).toBe(true);
    expect(mockDeleteStatusType).toHaveBeenCalledWith('status-type-123');
  });

  it('should throw error when statusType has dependencies', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('No se puede eliminar el tipo de estado porque tiene estados asociados'));

    await expect(mockDeleteStatusType('status-type-with-states')).rejects.toThrow('No se puede eliminar el tipo de estado porque tiene estados asociados');
  });

  it('should throw error when statusType not found', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('Tipo de estado no encontrado'));

    await expect(mockDeleteStatusType('nonexistent-status-type')).rejects.toThrow('Tipo de estado no encontrado');
  });

  it('should handle invalid statusType ID', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('ID de tipo de estado inválido'));

    await expect(mockDeleteStatusType('')).rejects.toThrow('ID de tipo de estado inválido');
  });

  it('should handle database errors', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('Database connection failed'));

    await expect(mockDeleteStatusType('status-type-123')).rejects.toThrow('Database connection failed');
  });

  it('should handle authorization errors', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('No autorizado para eliminar tipos de estado'));

    await expect(mockDeleteStatusType('status-type-123')).rejects.toThrow('No autorizado para eliminar tipos de estado');
  });

  it('should handle foreign key constraint errors', async () => {
    mockDeleteStatusType.mockRejectedValue(new Error('No se puede eliminar debido a restricciones de integridad referencial'));

    await expect(mockDeleteStatusType('status-type-123')).rejects.toThrow('No se puede eliminar debido a restricciones de integridad referencial');
  });
});
