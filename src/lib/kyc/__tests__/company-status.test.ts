import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { company: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { companyKycStatus } from '../company-status';

beforeEach(() => vi.clearAllMocks());

describe('companyKycStatus', () => {
  it('is verified only with a signature and a confirmed status', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ signatureID: 'sig-1', verificationStatus: 'VERIFIED' });
    await expect(companyKycStatus('co-1')).resolves.toEqual({ signatureID: 'sig-1', verified: true });
  });

  it('is not verified while the signature is still waiting', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ signatureID: 'sig-1', verificationStatus: 'WAITING' });
    await expect(companyKycStatus('co-1')).resolves.toEqual({ signatureID: 'sig-1', verified: false });
  });

  it('has no signature at all before any KYC has started', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ signatureID: null, verificationStatus: 'NOT_VERIFIED' });
    await expect(companyKycStatus('co-1')).resolves.toEqual({ signatureID: null, verified: false });
  });

  it('answers the same for a company that does not exist', async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    await expect(companyKycStatus('co-ajena')).resolves.toEqual({ signatureID: null, verified: false });
  });
});
