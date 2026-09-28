import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateSignature } = vi.hoisted(() => ({ mockCreateSignature: vi.fn() }));
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: { createSignature: mockCreateSignature },
}));
// The webhooks it registers do not matter here — @/lib/env is exercised on its own.
vi.mock('@/lib/env', () => ({ getDynamicAppUrl: async () => 'https://datia.test' }));

import { startCompanySignature } from '../create-company-signature';

beforeEach(() => vi.clearAllMocks());

describe('startCompanySignature', () => {
  it('asks iBS for a signature under the company\'s name, with the webhook URLs', async () => {
    mockCreateSignature.mockResolvedValue({ signature_id: 'sig-1', url: 'https://kyc.test/sig-1' });

    await expect(startCompanySignature('Filial Norte')).resolves.toEqual({
      signatureID: 'sig-1',
      kycURL: 'https://kyc.test/sig-1',
      verificationStatus: 'WAITING',
    });
    expect(mockCreateSignature).toHaveBeenCalledWith(
      'Filial Norte',
      'https://datia.test/api/hooks/signature/ok',
      'https://datia.test/api/hooks/signature/ko'
    );
  });

  it('never blocks creating the company: a usable, unverified result instead of a throw', async () => {
    mockCreateSignature.mockRejectedValue(new Error('iBS caído'));

    await expect(startCompanySignature('Filial Norte')).resolves.toEqual({
      signatureID: null,
      kycURL: null,
      verificationStatus: 'NOT_VERIFIED',
    });
  });
});
