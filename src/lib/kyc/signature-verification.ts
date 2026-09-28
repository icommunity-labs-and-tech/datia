import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';

/**
 * Applies the outcome of a KYC flow to the company that owns the signature (#23).
 *
 * Anyone can POST to the signature webhooks, so the body is only a hint: the
 * status is always read back from iBS before anything is written. It is the same
 * rule `applyCertification` follows for evidences.
 *
 * Returns whether a company changed state.
 */
export async function applySignatureVerification(signatureID: string): Promise<boolean> {
  const signature = await icommunityService.getSignature(signatureID);

  // iBS answers 200 with an empty signature for an id it does not know, so the
  // status only means something when the id matches.
  if (signature?.id !== signatureID) return false;

  const verificationStatus =
    signature.status === 'success' ? 'VERIFIED' : signature.status === 'failed' ? 'REJECTED' : null;
  if (!verificationStatus) return false;

  const { count } = await prisma.company.updateMany({
    where: { signatureID, verificationStatus: { not: verificationStatus } },
    data: { verificationStatus },
  });
  return count > 0;
}
