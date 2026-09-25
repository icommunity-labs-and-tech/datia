import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A new organization gets its default company, and its first account operates
 * the organization rather than one company (#20).
 */

const { tx, mockPrisma, mockSuper, mockSend } = vi.hoisted(() => {
  const tx = {
    organization: { create: vi.fn(async ({ data }: any) => ({ ...data })), delete: vi.fn() },
    company: { create: vi.fn(async ({ data }: any) => ({ id: 'co-new', ...data })) },
    user: { create: vi.fn(async ({ data }: any) => ({ ...data })), delete: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      organization: { findUnique: vi.fn(async () => null) },
      user: { findUnique: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
    mockSuper: vi.fn(),
    mockSend: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/tenant', () => ({ isSuperAdmin: mockSuper }));
vi.mock('../../organizations/helpers', () => ({ sendInvitationEmail: mockSend }));
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { createSignature: vi.fn(async () => ({ signature_id: 'sig-1', url: 'https://kyc.test' })) },
}));

import { createOrganizationWithAdmin } from '../../organizations/create-organization';

const input = { name: 'Acme', adminName: 'Ana', adminEmail: 'ana@acme.test' };

describe('createOrganizationWithAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuper.mockResolvedValue(true);
    mockSend.mockResolvedValue(undefined);
  });

  it('creates the default company and an organization account without a company', async () => {
    const result = await createOrganizationWithAdmin(input);

    expect(result.success).toBe(true);
    expect(tx.company.create).toHaveBeenCalledWith({
      data: { organizationId: expect.any(String), name: 'Acme' },
    });
    expect(tx.user.create.mock.calls[0][0].data).toMatchObject({
      email: 'ana@acme.test',
      role: 'ORG_ADMIN',
      companyId: null,
      status: 'PENDING',
    });
  });

  it('is for the superadmin only', async () => {
    mockSuper.mockResolvedValue(false);
    const result = await createOrganizationWithAdmin(input);

    expect(result.success).toBe(false);
    expect(tx.company.create).not.toHaveBeenCalled();
  });
});
