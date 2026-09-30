import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { notifyCompany } from '@/lib/notifications/notify';

const NOTIFICATION_CONTENT = {
  VERIFIED: {
    type: 'SUCCESS' as const,
    title: 'Verificación KYC completada',
    message: 'Tu empresa ya puede certificar activos.',
  },
  REJECTED: {
    type: 'ERROR' as const,
    title: 'Verificación KYC rechazada',
    message: 'La verificación de identidad de tu empresa no se ha superado. Vuelve a intentarlo desde ajustes.',
  },
};

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

  // Fetched before the write, so the notification below knows exactly which
  // companies changed — `updateMany` alone would not say (#28).
  const companies = await prisma.company.findMany({
    where: { signatureID, verificationStatus: { not: verificationStatus } },
    select: { id: true, organizationId: true },
  });
  if (companies.length === 0) return false;

  await prisma.company.updateMany({
    where: { signatureID, verificationStatus: { not: verificationStatus } },
    data: { verificationStatus },
  });

  await Promise.all(
    companies.map((company) =>
      notifyCompany(company.organizationId, company.id, {
        ...NOTIFICATION_CONTENT[verificationStatus],
        data: { companyId: company.id },
      })
    )
  );

  return true;
}
