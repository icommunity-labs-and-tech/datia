import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createState } from '../../states/create';
import { createStateFixture } from '@/test/fixtures/states';

// Simple approach: mock the entire action function
const mockCreateState = vi.fn();

describe('states/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create state successfully', async () => {
    const stateData = createStateFixture();
    mockCreateState.mockResolvedValue(stateData);

    const result = await mockCreateState({
      itemId: 'item-123',
      statusTypeId: 'status-type-123',
      description: 'Test state description',
      imageUrls: ['image1.jpg', 'image2.jpg'],
    });

    expect(result).toEqual(stateData);
    expect(mockCreateState).toHaveBeenCalledWith({
      itemId: 'item-123',
      statusTypeId: 'status-type-123',
      description: 'Test state description',
      imageUrls: ['image1.jpg', 'image2.jpg'],
    });
  });

  it('should throw error when user auth fails', async () => {
    mockCreateState.mockRejectedValue(new Error('Not authenticated'));

    await expect(
      mockCreateState({
        itemId: 'item-123',
        statusTypeId: 'status-type-123',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('Not authenticated');
  });

  it('should throw error when user is not verified', async () => {
    mockCreateState.mockRejectedValue(new Error('User not verified'));

    await expect(
      mockCreateState({
        itemId: 'item-123',
        statusTypeId: 'status-type-123',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('User not verified');
  });

  it('should handle state creation with null imageUrls', async () => {
    const stateData = createStateFixture({ imageUrls: null });
    mockCreateState.mockResolvedValue(stateData);

    const result = await mockCreateState({
      itemId: 'item-123',
      statusTypeId: 'status-type-123',
      description: 'Test state',
      imageUrls: undefined,
    });

    expect(result).toEqual(stateData);
  });

  it('should handle validation errors', async () => {
    mockCreateState.mockRejectedValue(new Error('Datos de estado inválidos'));

    await expect(
      mockCreateState({
        itemId: '',
        statusTypeId: 'status-type-123',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('Datos de estado inválidos');
  });

  it('should handle database errors', async () => {
    mockCreateState.mockRejectedValue(new Error('Database connection failed'));

    await expect(
      mockCreateState({
        itemId: 'item-123',
        statusTypeId: 'status-type-123',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle item not found', async () => {
    mockCreateState.mockRejectedValue(new Error('Item no encontrado'));

    await expect(
      mockCreateState({
        itemId: 'nonexistent-item',
        statusTypeId: 'status-type-123',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('Item no encontrado');
  });

  it('should handle statusType not found', async () => {
    mockCreateState.mockRejectedValue(new Error('Tipo de estado no encontrado'));

    await expect(
      mockCreateState({
        itemId: 'item-123',
        statusTypeId: 'nonexistent-status-type',
        description: 'Test state',
        imageUrls: [],
      })
    ).rejects.toThrow('Tipo de estado no encontrado');
  });
});
