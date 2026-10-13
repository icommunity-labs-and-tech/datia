import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A new organization gets its default company, and its first account operates
 * the organization rather than one company (#20).
 */

const { tx, mockPrisma, mockSuper, mockSend, mockCreateSignature } = vi.hoisted(() => {
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
    mockCreateSignature: vi.fn(async () => ({ signature_id: 'sig-1', url: 'https://kyc.test' })),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/tenant', () => ({ isSuperAdmin: mockSuper }));
vi.mock('../../organizations/helpers', () => ({
  sendInvitationEmail: mockSend,
  buildActivationUrl: vi.fn(async (token: string) => `https://datia.test/auth/activate?token=${token}`),
}));
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { createSignature: mockCreateSignature },
}));

import { createOrganizationWithAdmin } from '../../organizations/create-organization';

const input = { name: 'Acme', adminName: 'Ana', adminEmail: 'ana@acme.test' };

describe('createOrganizationWithAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuper.mockResolvedValue(true);
    mockSend.mockResolvedValue(undefined);
  });

  it('creates the default company with its own signature, and an organization account without a company', async () => {
    const result = await createOrganizationWithAdmin(input);

    expect(result.success).toBe(true);
    expect(tx.company.create).toHaveBeenCalledWith({
      data: {
        organizationId: expect.any(String),
        name: 'Acme',
        signatureID: 'sig-1',
        kycURL: 'https://kyc.test',
        verificationStatus: 'WAITING',
      },
    });
    expect(tx.organization.create.mock.calls[0][0].data).not.toHaveProperty('signatureID');
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

  it('still creates the organization when iBS cannot issue a signature', async () => {
    mockCreateSignature.mockRejectedValueOnce(new Error('iBS caído'));
    const result = await createOrganizationWithAdmin(input);

    expect(result.success).toBe(true);
    expect(tx.company.create).toHaveBeenCalledWith({
      data: {
        organizationId: expect.any(String),
        name: 'Acme',
        signatureID: null,
        kycURL: null,
        verificationStatus: 'NOT_VERIFIED',
      },
    });
  });

  it('still creates the organization when the invitation email fails, and returns the activation link', async () => {
    // Mailgun is a third party, not the alta itself: rolling everything back
    // for its own outage would force repeating work that is not at fault.
    mockSend.mockRejectedValueOnce(new Error('Mailgun API error 401: Unauthorized'));
    const result = await createOrganizationWithAdmin(input);

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(result.activationUrl).toContain(result.admin?.activationToken);
    expect(tx.organization.delete).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
});
