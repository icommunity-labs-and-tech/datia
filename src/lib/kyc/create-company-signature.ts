import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { getDynamicAppUrl } from '@/lib/env';

export interface CompanySignatureFields {
  signatureID: string | null;
  kycURL: string | null;
  verificationStatus: 'WAITING' | 'NOT_VERIFIED';
}

/**
 * Starts a company's KYC with iBS (#23): a signature it can present, and the
 * wizard URL to complete it.
 *
 * Every company certifies with its own signature — there is no organisation-
 * wide one any more. Failure here never blocks creating the company: it can
 * retry its own KYC later from its dashboard, so this always returns a usable,
 * if unverified, result instead of throwing.
 */
export async function startCompanySignature(companyName: string): Promise<CompanySignatureFields> {
  try {
    const appUrl = await getDynamicAppUrl();
    const okUrl = `${appUrl}/api/hooks/signature/ok`;
    const koUrl = `${appUrl}/api/hooks/signature/ko`;

    const result = await icommunityService.createSignature(companyName, okUrl, koUrl);
    return {
      signatureID: result.signature_id,
      kycURL: result.url || null,
      verificationStatus: 'WAITING',
    };
  } catch (error) {
    console.error('[kyc] Could not start signature for company:', error);
    return { signatureID: null, kycURL: null, verificationStatus: 'NOT_VERIFIED' };
  }
}
