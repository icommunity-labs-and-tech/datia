import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import { isSuperAdmin, requireOrganizationId, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { createSupportMessage } from '../create';
import { listSupportMessages } from '../list';
import { updateSupportMessageStatus } from '../updateStatus';
import { deleteSupportMessage } from '../delete';

vi.mock('@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma', () => ({
  supportMessageRepository: {
    create: vi.fn(async (input: any) => ({ id: 'msg-1', ...input })),
    findAll: vi.fn(async () => [{ id: 'msg-1' }]),
    updateStatus: vi.fn(async (id: string, status: string) => ({ id, status })),
    delete: vi.fn(async () => {}),
  },
}));

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return {
    ...actual,
    isSuperAdmin: vi.fn(async () => false),
    requireOrganizationId: vi.fn(async () => 'org-1'),
    getCurrentTenant: vi.fn(async () => ({ organizationId: 'org-1', userId: 'user-1', userRole: 'ADMIN' })),
  };
});

vi.mock('@/lib/auth/shared/session', () => ({
  getCurrentUserWithDetails: vi.fn(async () => ({ id: 'user-1', name: 'Ana' })),
}));

const repo = supportMessageRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('support message panel actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['list', () => listSupportMessages()],
    ['update', () => updateSupportMessageStatus('msg-1', 'resolved')],
    ['delete', () => deleteSupportMessage('msg-1')],
  ])('refuses to %s for anyone but a superadmin', async (_name, call) => {
    await expect(call()).rejects.toThrow(/SUPER_ADMIN/);
    expect(repo.findAll).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('lets a superadmin list every message', async () => {
    (isSuperAdmin as any).mockResolvedValueOnce(true);
    await expect(listSupportMessages()).resolves.toEqual([{ id: 'msg-1' }]);
  });

  it('rejects a status outside the known ones', async () => {
    (isSuperAdmin as any).mockResolvedValueOnce(true);
    await expect(updateSupportMessageStatus('msg-1', 'archived' as any)).rejects.toThrow(/no válido/);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});

describe('createSupportMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores the message under the session organisation and author', async () => {
    const result = await createSupportMessage({ subject: '  No certifica  ', message: ' Falla al anclar ', page: '/dashboard/items' });

    expect(result).toEqual({ success: true, id: 'msg-1' });
    expect(repo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'user-1',
      userName: 'Ana',
      subject: 'No certifica',
      message: 'Falla al anclar',
      page: '/dashboard/items',
    });
  });

  it('asks for both subject and message', async () => {
    await expect(createSupportMessage({ subject: ' ', message: 'algo' })).resolves.toEqual({ success: false, error: 'required' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('refuses a message over the limit', async () => {
    await expect(createSupportMessage({ subject: 'x', message: 'a'.repeat(5001) })).resolves.toEqual({ success: false, error: 'tooLong' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('reports an expired session instead of throwing', async () => {
    (requireOrganizationId as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));
    await expect(createSupportMessage({ subject: 'x', message: 'y' })).resolves.toEqual({ success: false, error: 'unauthorized' });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
