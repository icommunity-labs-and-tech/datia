import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Only a company account (ADMIN) does KYC, and only the first one activated
 * for its company — the organization account (ORG_ADMIN) has no company and
 * never does it (#23).
 */

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: { user: { findFirst: vi.fn() } } }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getOnboardingInfo } from '@/actions/organizations/get-onboarding-info';

const base = {
  name: 'Ana',
  status: 'PENDING',
  password: null,
  activationExpiresAt: new Date('2099-01-01'),
  Organization: { id: 'org-1', name: 'Acme', active: true },
};

beforeEach(() => vi.clearAllMocks());

describe('getOnboardingInfo', () => {
  it('is the first admin of its company when it is the oldest ADMIN account there', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...base,
      id: 'u-1',
      role: 'ADMIN',
      Company: {
        id: 'co-1',
        name: 'Filial',
        kycURL: 'https://kyc.test/1',
        verificationStatus: 'WAITING',
        User: [{ id: 'u-1', status: 'PENDING' }],
      },
    });

    const result = await getOnboardingInfo('tok');

    expect(result.info).toMatchObject({
      isFirstAdmin: true,
      role: 'ADMIN',
      companyId: 'co-1',
      companyName: 'Filial',
      kycURL: 'https://kyc.test/1',
      verificationStatus: 'WAITING',
    });
  });

  it('is not the first admin when someone else\'s account came first', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...base,
      id: 'u-2',
      role: 'ADMIN',
      Company: {
        id: 'co-1',
        name: 'Filial',
        kycURL: null,
        verificationStatus: 'VERIFIED',
        User: [{ id: 'u-1', status: 'ACTIVE' }, { id: 'u-2', status: 'PENDING' }],
      },
    });

    await expect(getOnboardingInfo('tok')).resolves.toMatchObject({ info: { isFirstAdmin: false } });
  });

  it('the organization account never does KYC: it has no company', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...base,
      id: 'u-org',
      role: 'ORG_ADMIN',
      Company: null,
    });

    const result = await getOnboardingInfo('tok');

    expect(result.info).toMatchObject({
      isFirstAdmin: false,
      role: 'ORG_ADMIN',
      companyId: null,
      companyName: null,
      kycURL: null,
      verificationStatus: 'NOT_VERIFIED',
    });
  });

  it('refuses an unknown token', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    await expect(getOnboardingInfo('tok')).resolves.toMatchObject({ success: false });
  });
});
