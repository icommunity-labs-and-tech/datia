import { randomUUID } from 'node:crypto';
import type { Certification } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/services/events';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import type { EvidenceData } from '@/infrastructure/icommunity/ICommunityService';

/**
 * A proof anchored in iBS, and the records it covers.
 *
 * Two moments, both driven by iBS: the evidence is *issued* when iBS accepts it
 * (a few hundred milliseconds, with its id), and *certified* when the
 * transaction lands on chain and iBS calls back on `evidence.certified`. Only
 * then do the records it covers count as verified.
 *
 * Emissions used to be certified by creating a State with the proof inside its
 * `templateConfig`; this is the entity that replaces it (#37, #63).
 */

export interface IssueCertificationInput {
  organizationId: string;
  signatureID: string;
  /** The asset the proof is about, recorded in the evidence metadata. */
  itemId: string;
  title: string;
  description: string;
  /** What is certified, exactly as it goes to iBS. */
  payload: Record<string, unknown>;
  emissionRecordIds: string[];
}

/**
 * Creates the evidence in iBS and records it as issued, linked to the records
 * it covers. Throws if iBS rejects it; nothing is written in that case.
 */
export async function issueCertification(input: IssueCertificationInput): Promise<Certification> {
  const id = randomUUID();

  const evidenceService = createEvidenceServiceImpl({ icommunityService });
  const evidenceId = await evidenceService.createCertificationEvidence({
    signatureID: input.signatureID,
    title: input.title,
    description: input.description,
    imageUrls: [],
    // Same shape evidences have always had on chain, so the verification report
    // reads old and new proofs alike.
    metadata: {
      id,
      itemId: input.itemId,
      createdAt: new Date().toISOString(),
      templateConfig: input.payload,
    },
  });

  const [certification] = await prisma.$transaction([
    prisma.certification.create({
      data: {
        id,
        organizationId: input.organizationId,
        evidenceId,
        payload: input.payload as object,
      },
    }),
    prisma.emissionRecord.updateMany({
      where: { id: { in: input.emissionRecordIds } },
      data: { certificationId: id },
    }),
  ]);

  await recordEvent(input.organizationId, {
    eventType: 'co2_certification_event',
    entityType: 'Certification',
    entityId: id,
    data: {
      certificationId: id,
      evidenceID: evidenceId,
      status: 'issued',
      emissionRecordIds: input.emissionRecordIds,
    },
  });

  return certification;
}

export interface AppliedCertification {
  certification: Certification;
  /** What iBS answered, when this call is what confirmed it. */
  evidence?: EvidenceData;
}

/**
 * Brings an issued proof to certified once iBS says it is on chain, and marks
 * every record it covers as verified.
 *
 * Idempotent: a proof already certified is returned as it is, so a repeated
 * webhook or a poll after the webhook changes nothing. Returns null for an
 * evidence that is not a certification here, or that iBS has not confirmed yet.
 */
export async function applyCertification(evidenceId: string): Promise<AppliedCertification | null> {
  const existing = await prisma.certification.findUnique({ where: { evidenceId } });
  if (!existing) return null;
  if (existing.status === 'CERTIFIED') return { certification: existing };

  let evidence: EvidenceData;
  try {
    evidence = await icommunityService.getEvidence(evidenceId);
  } catch {
    return null;
  }

  const onChain = evidence.certification;
  if (evidence.status !== 'certified' || !onChain?.hash) return null;

  const certifiedAt = new Date(onChain.timestamp ?? Date.now());
  const payload = (existing.payload ?? {}) as Record<string, unknown>;
  const asText = (value: unknown) => (typeof value === 'string' ? value : undefined);

  const [certification] = await prisma.$transaction([
    prisma.certification.update({
      where: { id: existing.id },
      data: {
        status: 'CERTIFIED',
        hash: onChain.hash,
        network: onChain.network,
        checkerUrl: onChain.links?.checker,
        blockExplorerUrl: onChain.links?.block_explorer,
        certifiedAt,
      },
    }),
    // Verification follows the anchoring, not the issuing.
    prisma.emissionRecord.updateMany({
      where: { certificationId: existing.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifierBody: asText(payload.verifierBody),
        verificationStandard: asText(payload.verificationStandard),
      },
    }),
  ]);

  await recordEvent(existing.organizationId, {
    eventType: 'co2_certification_event',
    entityType: 'Certification',
    entityId: existing.id,
    data: {
      certificationId: existing.id,
      evidenceID: evidenceId,
      status: 'certified',
      hash: onChain.hash,
      network: onChain.network,
      anchoredAt: certifiedAt.toISOString(),
    },
  });

  return { certification, evidence };
}

/** The certification as the API shows it on every certified resource. */
export function certificationSummary(certification: Certification) {
  return {
    id: certification.id,
    status: certification.status === 'CERTIFIED' ? 'certified' : 'issued',
    evidenceId: certification.evidenceId,
    network: certification.network,
    hash: certification.hash,
    checkerUrl: certification.checkerUrl,
    blockExplorerUrl: certification.blockExplorerUrl,
    certifiedAt: certification.certifiedAt?.toISOString() ?? null,
  };
}
