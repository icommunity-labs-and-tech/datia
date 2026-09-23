import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import type { EmissionVerificationReport } from '@/domain/energy/EnergyTypes';

/**
 * Verifies an emission against its proof on chain.
 *
 * iBS never returns the certified file, only the checksum it published for it
 * (`payload.integrity`), so verification compares checksums, not contents: the
 * one iBS publishes against the one recorded when the proof was issued. If they
 * match, the proof is intact; then the certified payload is compared field by
 * field with the record as it stands today, which is what surfaces a figure
 * that changed after being certified.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Asset: { organizationId: auth.organizationId } } },
    },
    include: { Certification: true },
  });

  if (!emission) {
    return NextResponse.json(
      { error: 'Emission record not found or does not belong to your organization' },
      { status: 404 }
    );
  }

  const certification = emission.Certification;
  if (!certification || certification.status !== 'CERTIFIED') {
    return NextResponse.json(
      {
        error: 'Emission record has not been certified yet',
        verificationStatus: emission.verificationStatus,
        certification: certification ? 'issued' : null,
      },
      { status: 422 }
    );
  }

  if (!certification.payloadChecksum) {
    // Proofs issued before checksums were recorded: the evidence is on chain,
    // but there is nothing to compare it against here.
    return NextResponse.json(
      {
        error: 'This proof predates checksum recording and cannot be verified automatically',
        certificationId: certification.id,
        evidenceId: certification.evidenceId,
      },
      { status: 409 }
    );
  }

  let evidence: Awaited<ReturnType<typeof icommunityService.getEvidence>>;
  try {
    evidence = await icommunityService.getEvidence(certification.evidenceId);
  } catch {
    return NextResponse.json(
      { error: 'Could not retrieve blockchain evidence. The iCommunity service may be unavailable.' },
      { status: 502 }
    );
  }

  const published = evidence.payload?.integrity?.find((entry) => entry.name?.endsWith('.json'));
  if (!published?.checksum) {
    return NextResponse.json(
      { error: 'The evidence publishes no checksum for its certified data' },
      { status: 502 }
    );
  }

  const intact = published.checksum === certification.payloadChecksum;

  // What the proof says, against what the record says now.
  const certified = (certification.payload ?? {}) as Record<string, unknown>;
  const discrepancies: string[] = [];
  const compare = (field: string, certifiedValue: unknown, current: unknown) => {
    if (certifiedValue === undefined || certifiedValue === null) return;
    if (String(certifiedValue) !== String(current ?? '')) {
      discrepancies.push(`${field}: certificado=${certifiedValue}, actual=${current}`);
    }
  };

  compare('co2eKg', certified.co2eKg, emission.co2eKg);
  compare('scope', certified.scope, emission.scope);
  compare('systemBoundary', certified.systemBoundary, emission.systemBoundary);
  compare('emissionFactor', certified.emissionFactor, emission.emissionFactor);
  compare('emissionFactorSource', certified.emissionFactorSource, emission.emissionFactorSource ?? '');
  compare('verifierBody', certified.verifierBody, emission.verifierBody ?? '');
  compare('verificationStandard', certified.verificationStandard, emission.verificationStandard ?? '');

  const asText = (value: unknown) => (typeof value === 'string' ? value : null);
  const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);
  const certifiedAt = (certification.certifiedAt ?? certification.createdAt).toISOString();

  const report: EmissionVerificationReport = {
    emissionRecordId: id,
    certificationId: certification.id,
    verified: intact && discrepancies.length === 0,
    evidence: {
      blockchain_tx: certification.hash ?? certification.evidenceId,
      timestamp: evidence.certification?.timestamp ?? certifiedAt,
      source: asText(certified.emissionFactorSource) ?? emission.emissionFactorSource ?? '',
      event_type: 'co2_certification_event',
      hash: certification.hash ?? '',
    },
    proof: {
      publishedChecksum: published.checksum,
      storedChecksum: certification.payloadChecksum,
      intact,
    },
    certifiedData: {
      co2eKg: asNumber(certified.co2eKg),
      scope: asText(certified.scope),
      systemBoundary: asText(certified.systemBoundary),
      verifierBody: asText(certified.verifierBody),
      verificationStandard: asText(certified.verificationStandard),
      certifiedAt,
    },
    discrepancies,
  };

  return NextResponse.json({ data: report });
}
