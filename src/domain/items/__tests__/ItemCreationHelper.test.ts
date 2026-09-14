import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemWithEvidence } from '../ItemCreationHelper';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        signatureID: `sig_${where.id}`,
        verificationStatus: 'VERIFIED',
      })),
    },
  },
}));

vi.mock('@/lib/auth/shared/session', () => ({ getCurrentUserWithDetails: vi.fn() }));

// Hands control back to the event loop so concurrent creations interleave.
const yieldToOthers = () => new Promise((resolve) => setTimeout(resolve, 5));

function makeDeps() {
  return {
    itemRepository: {
      create: vi.fn(async (data: any) => {
        await yieldToOthers();
        return { ...data, createdAt: new Date(), templateFields: null, itemTemplate: [] };
      }),
      delete: vi.fn(async () => {}),
      addCategoriesToItem: vi.fn(async () => {}),
      updateEvidenceId: vi.fn(async () => {}),
    },
    userRepository: { getById: vi.fn(async (id: string) => ({ id })) },
    evidenceService: {
      createItemEvidence: vi.fn(async () => {
        await yieldToOthers();
        return 'ev_1';
      }),
    },
  } as any;
}

const input = (organizationId: string, id: string, extra: Record<string, unknown> = {}) => ({
  organizationId,
  id,
  name: id,
  description: '',
  createdByUserId: null,
  ...extra,
});

describe('createItemWithEvidence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps two concurrent creations in their own organizations', async () => {
    const deps = makeDeps();

    await Promise.all([
      createItemWithEvidence(deps, input('org-a', 'item-a')),
      createItemWithEvidence(deps, input('org-b', 'item-b')),
    ]);

    const organizationOf = Object.fromEntries(
      deps.itemRepository.create.mock.calls.map(([data]: any[]) => [data.id, data.organizationId])
    );
    expect(organizationOf).toEqual({ 'item-a': 'org-a', 'item-b': 'org-b' });
    expect(deps.itemRepository.updateEvidenceId).toHaveBeenCalledWith('item-a', 'org-a', 'ev_1');
    expect(deps.itemRepository.updateEvidenceId).toHaveBeenCalledWith('item-b', 'org-b', 'ev_1');

    const signedWith = deps.evidenceService.createItemEvidence.mock.calls
      .map(([args]: any[]) => args.signatureID)
      .sort();
    expect(signedWith).toEqual(['sig_org-a', 'sig_org-b']);
  });

  it('records no creator for API calls without looking at the session', async () => {
    const deps = makeDeps();

    await createItemWithEvidence(deps, input('org-a', 'item-a'));

    expect(getCurrentUserWithDetails).not.toHaveBeenCalled();
    expect(deps.itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdByUserId: null })
    );
  });

  it('uses the signed-in user when no creator is given', async () => {
    const deps = makeDeps();
    (getCurrentUserWithDetails as any).mockResolvedValueOnce({ id: 'user-1' });

    await createItemWithEvidence(deps, input('org-a', 'item-a', { createdByUserId: undefined }));

    expect(deps.itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-a', createdByUserId: 'user-1' })
    );
  });
});
