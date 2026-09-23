import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantContextNotFoundError } from '@/lib/auth/tenant';

const { mockRequireOrg, mockCreateItem, mockRecordEvent } = vi.hoisted(() => ({
  mockRequireOrg: vi.fn(),
  mockCreateItem: vi.fn(),
  mockRecordEvent: vi.fn(),
}));

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireOrganizationId: mockRequireOrg };
});
vi.mock('@/domain/items/ItemServiceImpl', () => ({
  createItemServiceImpl: () => ({ createItem: mockCreateItem }),
}));
vi.mock('@/lib/services/events', () => ({ recordEvent: mockRecordEvent }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createAsset } from '@/actions/items/createAsset';
import { ItemAlreadyExistsError, OrganizationNotVerifiedError } from '@/domain/items/errors';

const input = { id: ' A-1 ', name: ' Turbina ', description: ' de prueba ', latitude: 41.31, longitude: -1.55 };

describe('createAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrg.mockResolvedValue('org-a');
    mockCreateItem.mockResolvedValue({ id: 'A-1', name: 'Turbina', description: 'de prueba' });
  });

  it('creates the asset with its position and trims what the form sends', async () => {
    const result = await createAsset(input);

    expect(result).toEqual({ success: true, id: 'A-1' });
    expect(mockCreateItem).toHaveBeenCalledWith('org-a', expect.objectContaining({
      customId: 'A-1',
      name: 'Turbina',
      description: 'de prueba',
      latitude: 41.31,
      longitude: -1.55,
    }));
    expect(mockRecordEvent).toHaveBeenCalledWith('org-a', expect.objectContaining({ eventType: 'item.created' }));
  });

  it('creates nothing without a session', async () => {
    mockRequireOrg.mockRejectedValue(new TenantContextNotFoundError('sin sesión'));
    const result = await createAsset(input);

    expect(result.success).toBe(false);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('requires an id and a name', async () => {
    expect(await createAsset({ ...input, id: '   ' })).toMatchObject({ success: false });
    expect(await createAsset({ ...input, name: '' })).toMatchObject({ success: false });
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('passes on what the domain says instead of a generic error', async () => {
    mockCreateItem.mockRejectedValue(new ItemAlreadyExistsError('A-1', 'El ID "A-1" ya existe.'));
    expect(await createAsset(input)).toEqual({ success: false, error: 'El ID "A-1" ya existe.' });

    mockCreateItem.mockRejectedValue(new OrganizationNotVerifiedError('org-a', 'no_signature', 'Completa el KYC.'));
    expect(await createAsset(input)).toEqual({ success: false, error: 'Completa el KYC.' });
  });
});
