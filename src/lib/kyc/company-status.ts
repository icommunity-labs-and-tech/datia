import { prisma } from '@/lib/prisma';

export interface CompanyKycStatus {
  signatureID: string | null;
  verified: boolean;
}

/**
 * Whether a company can sign evidence for iBS (#23): it needs a signature, and
 * that signature needs to be confirmed — `verified` is false for a signature
 * still WAITING on the KYC wizard, same as for one that never started.
 */
export async function companyKycStatus(companyId: string): Promise<CompanyKycStatus> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { signatureID: true, verificationStatus: true },
  });
  return {
    signatureID: company?.signatureID ?? null,
    verified: company?.verificationStatus === 'VERIFIED',
  };
}
