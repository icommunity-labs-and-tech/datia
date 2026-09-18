'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { applyCertification } from '@/lib/certification';
import { prisma } from '@/lib/prisma';

/**
 * Follows evidence from issued to anchored.
 *
 * iBS returns an evidence id straight away and writes the transaction a few
 * seconds later, so a freshly issued certification is not yet proof of anything. The
 * simulation leaves it issued and calls this until the chain confirms
 * it — which is what lets the interface show pending and confirmed side by side
 * while it happens, instead of claiming certification the moment the request
 * returns.
 *
 * iBS also calls back on `evidence.certified`, and whichever comes first confirms
 * it. Either way the status and the transaction hash come from iBS, not from a
 * timer.
 */

export interface BmsEvidenceStatus {
  evidenceID: string;
  /** `created` while pending, `certified` once anchored. */
  status: string;
  confirmed: boolean;
  /** Transaction hash on the primary chain, once anchored. */
  hash?: string;
  network?: string;
  /** Independent verifier link, as iBS reports it. */
  checkerUrl?: string;
  blockExplorerUrl?: string;
  /** Further chains the same evidence was mirrored onto. */
  mirrors?: Array<{ network?: string; hash?: string }>;
  certifiedAt?: string;
  /** True when this call is what confirmed the certification. */
  justConfirmed: boolean;
}

async function readOne(evidenceID: string, organizationId: string): Promise<BmsEvidenceStatus> {
  const certification = await prisma.certification.findFirst({
    where: { evidenceId: evidenceID, organizationId },
  });
  if (!certification) {
    return { evidenceID, status: 'unknown', confirmed: false, justConfirmed: false };
  }

  const wasCertified = certification.status === 'CERTIFIED';
  // Same path the `evidence.certified` webhook takes: whichever arrives first
  // confirms it, and the other finds it already done.
  const applied = await applyCertification(evidenceID);
  if (!applied) {
    // Not on chain yet, or iBS could not be read: keep it pending and retry.
    return { evidenceID, status: 'pending', confirmed: false, justConfirmed: false };
  }

  const confirmed = applied.certification;
  return {
    evidenceID,
    status: 'certified',
    confirmed: true,
    justConfirmed: !wasCertified,
    hash: confirmed.hash ?? undefined,
    network: confirmed.network ?? undefined,
    checkerUrl: confirmed.checkerUrl ?? undefined,
    blockExplorerUrl: confirmed.blockExplorerUrl ?? undefined,
    mirrors: applied.evidence?.certification?.mirrors?.map((m) => ({ network: m.network, hash: m.hash })),
    certifiedAt: confirmed.certifiedAt?.toISOString(),
  };
}

/**
 * Reads several evidences at once, so the interface polls in a single round
 * trip however many are still in flight.
 */
export async function confirmBmsEvidences(evidenceIDs: string[]): Promise<BmsEvidenceStatus[]> {
  if (!evidenceIDs.length) return [];
  const organizationId = await requireOrganizationId();
  return Promise.all(evidenceIDs.map((id) => readOne(id, organizationId)));
}
