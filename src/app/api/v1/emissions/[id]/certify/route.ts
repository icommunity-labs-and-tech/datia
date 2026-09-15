import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { prisma } from '@/lib/prisma';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { recordEvent } from '@/lib/services/events';
import { randomUUID } from 'crypto';

const schema = z.object({
  verifierBody: z.string().min(1),
  verificationStandard: z.string().default('ISO 14064-3'),
});

const CERTIFICATION_STATUS_TYPE_NAME = 'Certificación Energética';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  // ── 1. Load the full chain: EmissionRecord → Consumption → Source → Item ──
  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Item: { organizationId: auth.organizationId } } },
    },
    include: {
      EnergyConsumption: {
        include: {
          EnergySource: {
            include: { Item: true },
          },
        },
      },
    },
  });

  if (!emission) {
    return NextResponse.json({ error: 'Emission record not found or does not belong to your organization' }, { status: 404 });
  }

  if (emission.verificationStatus === 'VERIFIED') {
    return NextResponse.json({ error: 'Emission record is already certified' }, { status: 409 });
  }

  const item = emission.EnergyConsumption.EnergySource.Item;

  // ── 2. Verify the org has a signature (required for evidence creation) ──
  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { signatureID: true, verificationStatus: true },
  });

  if (!org?.signatureID) {
    return NextResponse.json(
      { error: 'Organization has no signature ID. Complete KYC before certifying emissions.' },
      { status: 422 }
    );
  }

  if (org.verificationStatus !== 'VERIFIED') {
    return NextResponse.json(
      { error: 'Organization verification is not complete.' },
      { status: 422 }
    );
  }

  // ── 3. Find or create the "Certificación Energética" StatusType ──
  let statusType = await prisma.statusType.findFirst({
    where: { organizationId: auth.organizationId, name: CERTIFICATION_STATUS_TYPE_NAME },
    select: { id: true },
  });

  if (!statusType) {
    statusType = await prisma.statusType.create({
      data: {
        id: randomUUID(),
        name: CERTIFICATION_STATUS_TYPE_NAME,
        description: 'Certificación de emisiones de CO₂ según estándares DPP/ESPR',
        template: [
          { label: 'CO₂e (kg)', name: 'co2eKg', type: 'number' },
          { label: 'Scope GHG', name: 'scope', type: 'text' },
          { label: 'Frontera del sistema', name: 'systemBoundary', type: 'text' },
          { label: 'Metodología de cálculo', name: 'calculationMethodology', type: 'text' },
          { label: 'Factor de emisión (kgCO2e/kWh)', name: 'emissionFactor', type: 'number' },
          { label: 'Fuente del factor', name: 'emissionFactorSource', type: 'text' },
          { label: 'Organismo verificador', name: 'verifierBody', type: 'text' },
          { label: 'Estándar de verificación', name: 'verificationStandard', type: 'text' },
        ],
        organizationId: auth.organizationId,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
  }

  // ── 4. Create State in DB (evidenceID='pending' while evidence is built) ──
  const state = await prisma.state.create({
    data: {
      id: randomUUID(),
      itemId: item.id,
      statusTypeId: statusType.id,
      title: `Certificación Energética — ${emission.co2eKg} kg CO₂e`,
      description: `Emisión certificada por ${parsed.data.verifierBody} según ${parsed.data.verificationStandard}`,
      evidenceID: 'pending',
      backed: false,
      templateConfig: {
        co2eKg: emission.co2eKg,
        scope: emission.scope,
        systemBoundary: emission.systemBoundary,
        calculationMethodology: emission.calculationMethodology,
        emissionFactor: emission.emissionFactor,
        emissionFactorSource: emission.emissionFactorSource,
        verifierBody: parsed.data.verifierBody,
        verificationStandard: parsed.data.verificationStandard,
      },
    },
  });

  // ── 5. Create evidence in iCommunity and anchor to blockchain ──
  try {
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const certifiedAt = new Date().toISOString();
    const evidenceID = await evidenceService.createStateEvidence({
      signatureID: org.signatureID,
      title: state.title,
      description: state.description,
      imageUrls: [],
      metadata: {
        id: state.id,
        itemId: item.id,
        createdAt: certifiedAt,
        templateConfig: {
          emissionRecordId: emission.id,
          co2eKg: emission.co2eKg,
          scope: emission.scope,
          systemBoundary: emission.systemBoundary,
          calculationMethodology: emission.calculationMethodology ?? '',
          emissionFactor: emission.emissionFactor,
          emissionFactorSource: emission.emissionFactorSource ?? '',
          gwpCharacterizationFactors: emission.gwpCharacterizationFactors ?? 'IPCC AR6',
          functionalUnit: emission.functionalUnit ?? '',
          verifierBody: parsed.data.verifierBody,
          verificationStandard: parsed.data.verificationStandard,
          certifiedAt,
        },
      },
    });

    // Update state with real evidenceID
    await prisma.state.update({
      where: { id: state.id },
      data: { evidenceID, backed: true, backedAt: new Date() },
    });

    // ── 6. Mark emission as VERIFIED ──
    await prisma.emissionRecord.update({
      where: { id: emission.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifierBody: parsed.data.verifierBody,
        verificationStandard: parsed.data.verificationStandard,
      },
    });

    await recordEvent(auth.organizationId, {
      eventType: 'co2_certification_event',
      entityType: 'EmissionRecord',
      entityId: emission.id,
      data: {
        emissionRecordId: emission.id,
        stateId: state.id,
        evidenceID,
        itemId: item.id,
        co2eKg: emission.co2eKg,
        verifierBody: parsed.data.verifierBody,
      },
    });

    return NextResponse.json({
      data: {
        emissionRecordId: emission.id,
        verificationStatus: 'VERIFIED',
        stateId: state.id,
        evidenceID,
        itemId: item.id,
      },
    }, { status: 200 });

  } catch (err) {
    // Evidence creation failed — roll back state and leave emission PENDING
    await prisma.state.delete({ where: { id: state.id } }).catch(() => null);
    console.error('[POST /api/v1/emissions/:id/certify] Evidence creation failed:', err);
    return NextResponse.json(
      { error: 'Certification failed: could not create blockchain evidence. The emission record remains PENDING.' },
      { status: 502 }
    );
  }
}
