import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { prisma } from '@/lib/prisma';
import { anchorEmissionById } from '@/lib/energy/anchor-service';
import { certificationSummary } from '@/lib/certification';
import { companyKycStatus } from '@/lib/kyc/company-status';
import { authScope, scopeWhere } from '@/lib/scope';

/**
 * Anchors an emission that was left without proof — because iBS was down when
 * it was written, or because the organisation had not finished KYC yet.
 *
 * Emissions are anchored as they are written; this is the same anchoring, on
 * demand. The proof is issued here and certified when iBS confirms it on chain
 * (`evidence.certified`), which is also when the emission becomes VERIFIED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const emission = await prisma.emissionRecord.findFirst({
    where: {
      id,
      EnergyConsumption: { EnergySource: { Asset: scopeWhere(authScope(auth)) } },
    },
    select: {
      id: true,
      Certification: true,
      EnergyConsumption: { select: { EnergySource: { select: { Asset: { select: { companyId: true } } } } } },
    },
  });

  if (!emission) {
    return NextResponse.json({ error: 'Emission record not found or does not belong to your organization' }, { status: 404 });
  }

  if (emission.Certification) {
    return NextResponse.json(
      { error: 'Emission record already has a certification', certification: certificationSummary(emission.Certification) },
      { status: 409 }
    );
  }

  // The company that owns the asset is the one that signs — not the token's,
  // which for an organisation-level token covers every company (#23).
  const companyId = emission.EnergyConsumption.EnergySource.Asset.companyId;
  const signature = companyId ? await companyKycStatus(companyId) : { signatureID: null, verified: false };

  if (!signature.signatureID) {
    return NextResponse.json(
      { error: 'Identity verification (KYC) is not complete. Complete it before certifying emissions.' },
      { status: 422 }
    );
  }

  if (!signature.verified) {
    return NextResponse.json({ error: 'Identity verification (KYC) is not complete.' }, { status: 422 });
  }

  const anchored = await anchorEmissionById(authScope(auth), id);

  if (!anchored?.certificationId) {
    return NextResponse.json(
      { error: 'Could not create blockchain evidence. The emission record remains without proof.', details: anchored?.error },
      { status: 502 }
    );
  }

  const certification = await prisma.certification.findUnique({ where: { id: anchored.certificationId } });

  return NextResponse.json(
    { data: certification ? certificationSummary(certification) : { id: anchored.certificationId, status: 'issued' } },
    { status: 201 }
  );
}
