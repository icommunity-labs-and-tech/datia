import { prisma } from '@/lib/prisma';
import { issueCertification } from '@/lib/certification';
import { scopeWhere, type Scope } from '@/lib/scope';

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
 * turns the certification into proof.
 *
 * Anchoring is best-effort by design. If iBS is unreachable the record is simply
 * left pending and ingestion succeeds anyway — making a client's meter unable to
 * write because a third party is down would be a far worse failure than a proof
 * that arrives late. `POST /emissions/{id}/certify` anchors it again on demand.
 */

const VERIFIER_BODY = 'AENOR';
const VERIFICATION_STANDARD = 'ISO 14064-3';

export interface AnchorDetail {
  emissionId: string;
  period: string;
  co2eKg: number;
  certificationId?: string;
  evidenceId?: string;
  error?: string;
}

/** Everything an anchoring needs that does not change between records. */
interface AnchorContext {
  signatureID: string;
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
        select: { id: true, name: true, Asset: { select: { id: true, name: true } } },
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
    EnergySource: { id: string; name: string; Asset: { id: string; name: string } };
  };
};

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

  return { signatureID: org.signatureID };
}

/** The period a reading covers, rendered for a title a person can read. */
export function periodLabel(start: Date, end: Date): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return day(start) === day(end) ? day(start) : `${day(start)} → ${day(end)}`;
}

async function anchorOne(
  scope: Scope,
  emission: EmissionRow,
  ctx: AnchorContext
): Promise<AnchorDetail> {
  const consumption = emission.EnergyConsumption;
  const source = consumption.EnergySource;
  const item = source.Asset;
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

  try {
    const certification = await issueCertification({
      scope,
      signatureID: ctx.signatureID,
      assetId: item.id,
      title: `Emisión certificada — ${period} · ${emission.co2eKg} kg CO₂e`,
      description:
        `${item.name} · ${source.name} · ${consumption.consumptionKwh} kWh en ${period}. ` +
        `Verificada por ${VERIFIER_BODY} según ${VERIFICATION_STANDARD}.`,
      payload: issued,
      emissionRecordIds: [emission.id],
    });

    return {
      emissionId: emission.id,
      period,
      co2eKg: emission.co2eKg,
      certificationId: certification.id,
      evidenceId: certification.evidenceId,
    };
  } catch (err) {
    // Nothing is written when iBS rejects the evidence: the record stays
    // pending and can be anchored again.
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
  scope: Scope,
  emissionId: string
): Promise<AnchorDetail | null> {
  try {
    const ctx = await loadContext(scope.organizationId);
    if (!ctx) return null;

    const emission = (await prisma.emissionRecord.findFirst({
      where: {
        id: emissionId,
        // An issued proof is waiting for the chain; a second one would pay for
        // another transaction for the same figure.
        certificationId: null,
        EnergyConsumption: { EnergySource: { Asset: scopeWhere(scope) } },
      },
      select: EMISSION_SELECT,
    })) as EmissionRow | null;
    if (!emission) return null;

    return await anchorOne(scope, emission, ctx);
  } catch {
    return null;
  }
}
