import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/services/events';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';

/**
 * Anchors the energy record without anyone having to ask.
 *
 * Certification used to be a second, explicit call — `POST /emissions/:id/certify`
 * — which left traceability to whoever integrated: certify some records, skip
 * others, and nothing in the system says so. For a framework like ESPR that is
 * precisely what an audit looks for.
 *
 * One evidence per emission record, issued as the record is written. iBS answers
 * in a few hundred milliseconds and a 201 is its commitment that the evidence
 * will be certified, so ingestion does not wait for the chain: the transaction
 * lands seconds later and iBS calls back on `evidence.certified`, which is what
 * turns the state into proof.
 *
 * Anchoring is best-effort by design. If iBS is unreachable the record is simply
 * left pending and ingestion succeeds anyway — making a client's meter unable to
 * write because a third party is down would be a far worse failure than a proof
 * that arrives late. `anchorPendingEmissions` picks those up afterwards.
 */

const VERIFIER_BODY = 'AENOR';
const VERIFICATION_STANDARD = 'ISO 14064-3';
const CERTIFICATION_STATUS_TYPE_NAME = 'Certificación Energética';

/** How many records one sweep anchors. Bounded so no single call runs long. */
export const DEFAULT_SWEEP_LIMIT = 25;

export interface AnchorDetail {
  emissionId: string;
  period: string;
  co2eKg: number;
  evidenceID?: string;
  error?: string;
}

export interface AnchorSweepResult {
  /** Emissions with no proof when the sweep started. */
  pending: number;
  anchored: number;
  failed: number;
  /** Left for the next sweep because of the limit. */
  skipped: number;
  details: AnchorDetail[];
}

/** Everything an anchoring needs that does not change between records. */
interface AnchorContext {
  signatureID: string;
  statusTypeId: string;
}

/** What the proof needs to know about the record it certifies. */
const EMISSION_SELECT = {
  id: true,
  co2eKg: true,
  scope: true,
  systemBoundary: true,
  emissionFactor: true,
  emissionFactorSource: true,
  calculationMethodology: true,
  gwpCharacterizationFactors: true,
  EnergyConsumption: {
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      consumptionKwh: true,
      measurementStandard: true,
      EnergySource: {
        select: { id: true, name: true, Item: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

type EmissionRow = {
  id: string;
  co2eKg: number;
  scope: string;
  systemBoundary: string;
  emissionFactor: number | null;
  emissionFactorSource: string | null;
  calculationMethodology: string | null;
  gwpCharacterizationFactors: string | null;
  EnergyConsumption: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    consumptionKwh: number;
    measurementStandard: string | null;
    EnergySource: { id: string; name: string; Item: { id: string; name: string } };
  };
};

/** Ensures the status type the anchoring states hang from exists. */
async function certificationStatusTypeId(organizationId: string): Promise<string> {
  const existing = await prisma.statusType.findFirst({
    where: { organizationId, name: CERTIFICATION_STATUS_TYPE_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.statusType.create({
    data: {
      id: randomUUID(),
      name: CERTIFICATION_STATUS_TYPE_NAME,
      description: 'Certificación de emisiones de CO₂ según estándares DPP/ESPR',
      template: [
        { label: 'Periodo', name: 'period', type: 'text' },
        { label: 'Energía (kWh)', name: 'consumptionKwh', type: 'number' },
        { label: 'CO₂e (kg)', name: 'co2eKg', type: 'number' },
        { label: 'Organismo verificador', name: 'verifierBody', type: 'text' },
      ],
      organizationId,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Loads what anchoring needs, or nothing when the organisation cannot sign.
 * Without a verified identity there is nobody to sign the evidence, and records
 * stay pending rather than being marked certified on a signature that is not.
 */
async function loadContext(organizationId: string): Promise<AnchorContext | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { signatureID: true, verificationStatus: true },
  });
  if (!org?.signatureID || org.verificationStatus !== 'VERIFIED') return null;

  return {
    signatureID: org.signatureID,
    statusTypeId: await certificationStatusTypeId(organizationId),
  };
}

/** The period a reading covers, rendered for a title a person can read. */
export function periodLabel(start: Date, end: Date): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return day(start) === day(end) ? day(start) : `${day(start)} → ${day(end)}`;
}

async function anchorOne(
  organizationId: string,
  emission: EmissionRow,
  ctx: AnchorContext
): Promise<AnchorDetail> {
  const consumption = emission.EnergyConsumption;
  const source = consumption.EnergySource;
  const item = source.Item;
  const period = periodLabel(consumption.periodStart, consumption.periodEnd);

  // Everything the figure rests on travels with the proof: what was measured,
  // over what period, from which source, and by what factor it became CO₂e. A
  // number without that is not auditable.
  const issued = {
    emissionRecordId: emission.id,
    energyConsumptionId: consumption.id,
    assetName: item.name,
    sourceName: source.name,
    period,
    periodStart: consumption.periodStart.toISOString(),
    periodEnd: consumption.periodEnd.toISOString(),
    consumptionKwh: consumption.consumptionKwh,
    measurementStandard: consumption.measurementStandard ?? '',
    co2eKg: emission.co2eKg,
    scope: emission.scope,
    systemBoundary: emission.systemBoundary,
    emissionFactor: emission.emissionFactor,
    emissionFactorSource: emission.emissionFactorSource ?? '',
    calculationMethodology: emission.calculationMethodology ?? '',
    gwpCharacterizationFactors: emission.gwpCharacterizationFactors ?? '',
    verifierBody: VERIFIER_BODY,
    verificationStandard: VERIFICATION_STANDARD,
  };

  const state = await prisma.state.create({
    data: {
      id: randomUUID(),
      itemId: item.id,
      statusTypeId: ctx.statusTypeId,
      title: `Emisión certificada — ${period} · ${emission.co2eKg} kg CO₂e`,
      description:
        `${item.name} · ${source.name} · ${consumption.consumptionKwh} kWh en ${period}. ` +
        `Verificada por ${VERIFIER_BODY} según ${VERIFICATION_STANDARD}.`,
      evidenceID: 'pending',
      backed: false,
      templateConfig: issued,
    },
  });

  try {
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const evidenceID = await evidenceService.createStateEvidence({
      signatureID: ctx.signatureID,
      title: state.title,
      description: state.description ?? '',
      imageUrls: [],
      metadata: {
        id: state.id,
        itemId: item.id,
        createdAt: new Date().toISOString(),
        templateConfig: issued,
      },
    });

    // Issued, not yet anchored: iBS writes the transaction seconds later and
    // calls back on `evidence.certified`, which is what marks this backed.
    await prisma.state.update({ where: { id: state.id }, data: { evidenceID } });

    await recordEvent(organizationId, {
      eventType: 'co2_certification_event',
      entityType: 'State',
      entityId: state.id,
      data: {
        stateId: state.id,
        evidenceID,
        emissionRecordId: emission.id,
        sourceId: source.id,
        period,
      },
    });

    return { emissionId: emission.id, period, co2eKg: emission.co2eKg, evidenceID };
  } catch (err) {
    // Leaves nothing half-written: the record stays pending and a later sweep
    // picks it up.
    await prisma.state.delete({ where: { id: state.id } }).catch(() => null);
    return {
      emissionId: emission.id,
      period,
      co2eKg: emission.co2eKg,
      error: err instanceof Error ? err.message : 'Error desconocido al anclar',
    };
  }
}

/**
 * Anchors one record, as it is written.
 *
 * Never throws: the caller is an ingestion request, and a proof that could not
 * be issued must not cost the client the reading itself.
 */
export async function anchorEmissionById(
  organizationId: string,
  emissionId: string
): Promise<AnchorDetail | null> {
  try {
    const ctx = await loadContext(organizationId);
    if (!ctx) return null;

    const emission = (await prisma.emissionRecord.findFirst({
      where: {
        id: emissionId,
        verificationStatus: 'PENDING',
        EnergyConsumption: { EnergySource: { Item: { organizationId } } },
      },
      select: EMISSION_SELECT,
    })) as EmissionRow | null;
    if (!emission) return null;

    return await anchorOne(organizationId, emission, ctx);
  } catch {
    return null;
  }
}

/**
 * Anchors whatever was left pending — because iBS was unreachable when the
 * record came in, or because the organisation had no verified identity yet.
 *
 * Deliberately trigger-agnostic: it takes no request, does a bounded amount of
 * work, and is safe to call any number of times.
 */
export async function anchorPendingEmissions(
  organizationId: string,
  options: { limit?: number } = {}
): Promise<AnchorSweepResult> {
  const limit = options.limit ?? DEFAULT_SWEEP_LIMIT;
  const result: AnchorSweepResult = { pending: 0, anchored: 0, failed: 0, skipped: 0, details: [] };

  const ctx = await loadContext(organizationId);
  if (!ctx) return result;

  const where = {
    verificationStatus: 'PENDING' as const,
    EnergyConsumption: { EnergySource: { Item: { organizationId } } },
  };

  result.pending = await prisma.emissionRecord.count({ where });
  if (!result.pending) return result;
  result.skipped = Math.max(0, result.pending - limit);

  const rows = (await prisma.emissionRecord.findMany({
    where,
    // Oldest first: the longer a figure has gone unproven, the more it matters.
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: EMISSION_SELECT,
  })) as EmissionRow[];

  for (const emission of rows) {
    const detail = await anchorOne(organizationId, emission, ctx);
    result.details.push(detail);
    if (detail.evidenceID) result.anchored++;
    else result.failed++;
  }

  return result;
}

/**
 * Brings anchored evidence to confirmed, for whatever the webhook did not close.
 *
 * iBS calls back on `evidence.certified` and that is the normal path; this is
 * the repair for a callback that never arrived — a deploy in flight, a network
 * blip. The status and the transaction hash come from iBS either way.
 */
export interface ConfirmSweepResult {
  checked: number;
  confirmed: number;
  stillWaiting: number;
}

/**
 * Applies one certification: marks the state backed, stores the transaction and
 * verifies every record the evidence covers.
 *
 * Shared by the webhook and the repair sweep so both leave the same result — the
 * webhook used to only flip `backed`, which left the emission pending and lost
 * the hash.
 */
export async function applyCertification(evidenceID: string): Promise<boolean> {
  const state = await prisma.state.findFirst({
    where: { evidenceID },
    select: { id: true, backed: true, templateConfig: true, Item: { select: { organizationId: true } } },
  });
  if (!state) return false;

  let evidence;
  try {
    evidence = await icommunityService.getEvidence(evidenceID);
  } catch {
    return false;
  }

  const cert = evidence.certification;
  if (evidence.status !== 'certified' || !cert?.hash) return false;

  const issued = (state.templateConfig ?? {}) as Record<string, unknown>;
  const asText = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const certifiedAt = cert.timestamp ?? new Date().toISOString();

  await prisma.state.update({
    where: { id: state.id },
    data: {
      backed: true,
      backedAt: new Date(certifiedAt),
      templateConfig: {
        ...issued,
        certificationHash: cert.hash,
        certificationNetwork: cert.network,
        checkerUrl: cert.links?.checker,
        blockExplorerUrl: cert.links?.block_explorer,
        certifiedAt,
      },
    },
  });

  // An evidence covers one record now; earlier ones covered a whole period.
  // Both are honoured so nothing that came before is stranded.
  const covered = Array.isArray(issued.emissionRecordIds)
    ? (issued.emissionRecordIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : [asText(issued.emissionRecordId)].filter((v): v is string => Boolean(v));

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

  await recordEvent(state.Item.organizationId, {
    eventType: 'co2_certification_event',
    entityType: 'State',
    entityId: state.id,
    data: {
      stateId: state.id,
      evidenceID,
      hash: cert.hash,
      network: cert.network,
      anchoredAt: certifiedAt,
      records: covered.length,
    },
  });

  return true;
}

export async function confirmAnchoredEvidences(
  organizationId: string,
  limit = 50
): Promise<ConfirmSweepResult> {
  const waiting = await prisma.state.findMany({
    where: {
      backed: false,
      evidenceID: { not: 'pending' },
      Item: { organizationId },
    },
    select: { id: true, evidenceID: true, templateConfig: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const result: ConfirmSweepResult = { checked: waiting.length, confirmed: 0, stillWaiting: 0 };

  for (const state of waiting) {
    if (await applyCertification(state.evidenceID)) result.confirmed++;
    else result.stillWaiting++;
  }

  return result;
}
