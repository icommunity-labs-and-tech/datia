'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { recordEvent } from '@/lib/services/events';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { prisma } from '@/lib/prisma';

/**
 * Follows evidence from issued to anchored.
 *
 * iBS returns an evidence id straight away and writes the transaction a few
 * seconds later, so a freshly certified state is not yet proof of anything. The
 * simulation leaves it `backed: false` and calls this until the chain confirms
 * it — which is what lets the interface show pending and confirmed side by side
 * while it happens, instead of claiming certification the moment the request
 * returns.
 *
 * iBS offers no push channel for evidences, only `GET /evidences/{id}`, so the
 * progress signal has to be polled. It is a real signal all the same: `status`
 * and the transaction hash come from iBS, not from a timer.
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
  /** True when this call is what flipped the state to backed. */
  justConfirmed: boolean;
}

async function readOne(evidenceID: string, organizationId: string): Promise<BmsEvidenceStatus> {
  const state = await prisma.state.findFirst({
    where: { evidenceID, Item: { organizationId } },
    select: { id: true, backed: true, templateConfig: true },
  });
  if (!state) {
    return { evidenceID, status: 'unknown', confirmed: false, justConfirmed: false };
  }

  // Already anchored: report what was stored instead of asking iBS again.
  if (state.backed) {
    const cfg = (state.templateConfig ?? {}) as Record<string, unknown>;
    return {
      evidenceID,
      status: 'certified',
      confirmed: true,
      justConfirmed: false,
      hash: typeof cfg.certificationHash === 'string' ? cfg.certificationHash : undefined,
      network: typeof cfg.certificationNetwork === 'string' ? cfg.certificationNetwork : undefined,
      checkerUrl: typeof cfg.checkerUrl === 'string' ? cfg.checkerUrl : undefined,
    };
  }

  let evidence;
  try {
    evidence = await icommunityService.getEvidence(evidenceID);
  } catch {
    // A read that fails is not a failed anchoring: keep it pending and retry.
    return { evidenceID, status: 'pending', confirmed: false, justConfirmed: false };
  }

  const status = evidence.status ?? 'created';
  const cert = evidence.certification;
  const confirmed = status === 'certified' && Boolean(cert?.hash);

  if (!confirmed) {
    return { evidenceID, status, confirmed: false, justConfirmed: false };
  }

  const certifiedAt = cert?.timestamp ?? new Date().toISOString();
  // What certification wrote when the evidence was issued: it carries the
  // emission this proof belongs to and who verified it.
  const issued = (state.templateConfig ?? {}) as Record<string, unknown>;
  const asText = (value: unknown) => (typeof value === 'string' ? value : undefined);

  await prisma.state.update({
    where: { id: state.id },
    data: {
      backed: true,
      backedAt: new Date(certifiedAt),
      templateConfig: {
        ...issued,
        certificationHash: cert?.hash,
        certificationNetwork: cert?.network,
        checkerUrl: cert?.links?.checker,
        blockExplorerUrl: cert?.links?.block_explorer,
        certifiedAt,
      },
    },
  });

  // Verification follows the anchoring, not the issuing: the emission counts as
  // verified once its proof is on chain. It is also what stops a re-run from
  // certifying the same emission again and paying for a second transaction.
  // A monthly evidence covers every reading of its period, so confirming it
  // verifies them all at once; a single-emission one carries just its own.
  const covered = Array.isArray(issued.emissionRecordIds)
    ? (issued.emissionRecordIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [asText(issued.emissionRecordId)].filter((id): id is string => Boolean(id));

  if (covered.length) {
    await prisma.emissionRecord
      .updateMany({
        where: { id: { in: covered } },
        data: {
          verificationStatus: 'VERIFIED',
          verifierBody: asText(issued.verifierBody),
          verificationStandard: asText(issued.verificationStandard),
        },
      })
      .catch(() => null);
  }

  await recordEvent(organizationId, {
    eventType: 'co2_certification_event',
    entityType: 'State',
    entityId: state.id,
    data: {
      stateId: state.id,
      evidenceID,
      hash: cert?.hash,
      network: cert?.network,
      anchoredAt: certifiedAt,
    },
  });

  return {
    evidenceID,
    status,
    confirmed: true,
    justConfirmed: true,
    hash: cert?.hash,
    network: cert?.network,
    checkerUrl: cert?.links?.checker,
    blockExplorerUrl: cert?.links?.block_explorer,
    mirrors: cert?.mirrors?.map((m) => ({ network: m.network, hash: m.hash })),
    certifiedAt,
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
