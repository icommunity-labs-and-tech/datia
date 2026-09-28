import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A company retries its own KYC, and only that: requireScope refuses anyone
 * without a company (the organization account, SUPER_ADMIN) (#23).
 */

const { mockRequireScope, mockPrisma, mockStartSignature } = vi.hoisted(() => ({
  mockRequireScope: vi.fn(),
  mockPrisma: { company: { findUnique: vi.fn(), update: vi.fn() } },
  mockStartSignature: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireScope: mockRequireScope };
});
vi.mock('@/lib/kyc/create-company-signature', () => ({ startCompanySignature: mockStartSignature }));

import { retryCompanyKyc } from '@/actions/kyc/retry';

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireScope.mockResolvedValue({ organizationId: 'org-1', companyId: 'co-1' });
  mockPrisma.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Datia' });
  mockStartSignature.mockResolvedValue({ signatureID: 'sig-2', kycURL: 'https://kyc.test/2', verificationStatus: 'WAITING' });
});

describe('retryCompanyKyc', () => {
  it('replaces the signature of the company of the session', async () => {
    const result = await retryCompanyKyc();

    expect(result).toEqual({ success: true, kycURL: 'https://kyc.test/2' });
    expect(mockStartSignature).toHaveBeenCalledWith('Datia');
    expect(mockPrisma.company.update).toHaveBeenCalledWith({
      where: { id: 'co-1' },
      data: { signatureID: 'sig-2', kycURL: 'https://kyc.test/2', verificationStatus: 'WAITING' },
    });
  });

  it('is refused without a session', async () => {
    const { TenantContextNotFoundError } = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
    mockRequireScope.mockRejectedValue(new TenantContextNotFoundError('sin sesión'));

    expect((await retryCompanyKyc()).success).toBe(false);
    expect(mockPrisma.company.update).not.toHaveBeenCalled();
  });
});
