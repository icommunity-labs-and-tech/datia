import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateWithEvidence, mockRecordEvent } = vi.hoisted(() => ({
  mockCreateWithEvidence: vi.fn(),
  mockRecordEvent: vi.fn(),
}));

vi.mock('../AssetCreationHelper', () => ({ createAssetWithEvidence: mockCreateWithEvidence }));
vi.mock('@/lib/services/events', () => ({ recordEvent: mockRecordEvent }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createAssetServiceImpl } from '../AssetServiceImpl';
import { AssetAlreadyExistsError } from '../errors';

const deps = () => ({
  assetRepository: { getById: vi.fn(async () => null) },
  userRepository: {},
  evidenceService: {},
}) as never;

describe('createAssetServiceImpl.createAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWithEvidence.mockResolvedValue({ id: 'A-1', name: 'Turbina', description: 'd', imageUrl: null });
  });

  it('announces asset.created, so the API and the dashboard both emit it', async () => {
    await createAssetServiceImpl(deps()).createAsset('org-a', { customId: 'A-1', name: 'Turbina', description: 'd' });

    expect(mockRecordEvent).toHaveBeenCalledWith('org-a', {
      eventType: 'asset.created',
      entityType: 'Asset',
      entityId: 'A-1',
      data: { id: 'A-1', name: 'Turbina' },
    });
  });

  it('announces nothing when the asset already exists', async () => {
    const d = { assetRepository: { getById: vi.fn(async () => ({ id: 'A-1' })) }, userRepository: {}, evidenceService: {} } as never;
    await expect(
      createAssetServiceImpl(d).createAsset('org-a', { customId: 'A-1', name: 'x', description: '' })
    ).rejects.toBeInstanceOf(AssetAlreadyExistsError);
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });
});
