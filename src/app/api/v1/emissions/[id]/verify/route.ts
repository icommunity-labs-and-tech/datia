import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { prisma } from '@/lib/prisma';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import type { EmissionVerificationReport, EvidenceAuditRecord } from '@/domain/energy/EnergyTypes';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // ── 1. Load the full chain: EmissionRecord → Consumption → Source → Item ──
  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Item: { organizationId: auth.organizationId } } },
    },
    include: {
      EnergyConsumption: {
        include: { EnergySource: { include: { Item: true } } },
      },
      Certification: true,
    },
  });

  if (!emission) {
    return NextResponse.json(
      { error: 'Emission record not found or does not belong to your organization' },
      { status: 404 }
    );
  }

  // ── 2. The proof that covers it, confirmed on chain ──
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

  const evidenceID = certification.evidenceId;
  const certifiedAt = (certification.certifiedAt ?? certification.createdAt).toISOString();

  // ── 3. Fetch blockchain evidence from iCommunity ──
  let evidenceData: Awaited<ReturnType<typeof icommunityService.getEvidence>>;
  try {
    evidenceData = await icommunityService.getEvidence(evidenceID);
  } catch {
    return NextResponse.json(
      { error: 'Could not retrieve blockchain evidence. The iCommunity service may be unavailable.' },
      { status: 502 }
    );
  }

  // ── 4. Parse the stored evidence JSON ──
  const jsonFile = evidenceData.payload?.files?.find(
    (f) => f.name === 'issue_data.json'
  );

  if (!jsonFile) {
    return NextResponse.json(
      { error: 'Evidence JSON file not found in blockchain record' },
      { status: 500 }
    );
  }

  const rawJson = Buffer.from(jsonFile.file, 'base64').toString('utf8');
  const storedEvidence = JSON.parse(rawJson) as {
    templateConfig?: Record<string, unknown>;
    [key: string]: unknown;
  };

  const stored = (storedEvidence.templateConfig ?? {}) as Record<string, unknown>;

  // ── 5. Compute SHA-256 of the canonical evidence payload ──
  const hash = sha256(rawJson);

  // ── 6. Compare stored fields vs current DB emission record ──
  const discrepancies: string[] = [];

  const numDiff = (field: string, stored: unknown, current: unknown) => {
    if (stored !== undefined && Number(stored) !== Number(current)) {
      discrepancies.push(`${field}: stored=${stored}, current=${current}`);
    }
  };
  const strDiff = (field: string, stored: unknown, current: unknown) => {
    if (stored !== undefined && String(stored) !== String(current ?? '')) {
      discrepancies.push(`${field}: stored=${stored}, current=${current}`);
    }
  };

  numDiff('co2eKg', stored.co2eKg, emission.co2eKg);
  strDiff('scope', stored.scope, emission.scope);
  strDiff('systemBoundary', stored.systemBoundary, emission.systemBoundary);
  strDiff('emissionFactorSource', stored.emissionFactorSource, emission.emissionFactorSource ?? '');
  strDiff('verifierBody', stored.verifierBody, emission.verifierBody ?? '');
  strDiff('verificationStandard', stored.verificationStandard, emission.verificationStandard ?? '');

  const evidenceAudit: EvidenceAuditRecord = {
    blockchain_tx: evidenceID,
    timestamp: evidenceData.timestamp ?? certifiedAt,
    source: String(stored.emissionFactorSource ?? emission.emissionFactorSource ?? ''),
    event_type: 'co2_certification_event',
    hash,
  };

  const report: EmissionVerificationReport = {
    emissionRecordId: id,
    certificationId: certification.id,
    verified: discrepancies.length === 0,
    evidence: evidenceAudit,
    originalData: {
      co2eKg: emission.co2eKg,
      scope: emission.scope as EmissionVerificationReport['originalData']['scope'],
      systemBoundary: emission.systemBoundary as EmissionVerificationReport['originalData']['systemBoundary'],
      verifierBody: emission.verifierBody ?? '',
      verificationStandard: emission.verificationStandard ?? '',
      certifiedAt: String(stored.certifiedAt ?? certifiedAt),
    },
    discrepancies,
  };

  return NextResponse.json({ data: report });
}
