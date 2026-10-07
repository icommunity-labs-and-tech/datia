import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decodeUrlParam } from '@/lib/api/decode-param';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  try {

    if (!rawCode) {
      return NextResponse.json(
        { error: 'Código requerido' },
        { status: 400 }
      );
    }

    // Decode the code parameter in case it's URL-encoded
    const code = decodeUrlParam(rawCode);
    console.log('[API] Looking for asset with ID:', code);

    // Buscar el activo por ID (asumiendo que el código es el ID del activo)
    const asset = await prisma.asset.findUnique({
      where: {
        id: code,
      },
      include: {
        Organization: {
          select: {
            name: true,
            logoUrl: true,
            brandColorPrimary: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          }
        },
        EnergySource: {
          include: {
            EnergyConsumption: {
              include: {
                EmissionRecord: {
                  where: { verificationStatus: 'VERIFIED' },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Activo no encontrado' },
        { status: 404 }
      );
    }

    // Transformar los datos para el frontend
    const transformedAsset = {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      imageUrl: asset.imageUrl,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      latitude: asset.latitude,
      longitude: asset.longitude,
      evidenceId: asset.evidenceId || null,
      createdBy: asset.User || null,
      organization: asset.Organization
        ? {
            name: asset.Organization.name,
            logoUrl: asset.Organization.logoUrl,
            brandColorPrimary: asset.Organization.brandColorPrimary,
          }
        : null,
      energyCertifications: asset.EnergySource.flatMap((src) =>
        src.EnergyConsumption.flatMap((c) =>
          c.EmissionRecord.map((e) => ({
            id: e.id,
            co2eKg: e.co2eKg,
            scope: e.scope,
            systemBoundary: e.systemBoundary,
            calculationMethodology: e.calculationMethodology,
            verifierBody: e.verifierBody,
            verificationStandard: e.verificationStandard,
            verificationStatus: e.verificationStatus,
            periodStart: c.periodStart,
            periodEnd: c.periodEnd,
            consumptionKwh: c.consumptionKwh,
            energyCarrier: src.energyCarrier,
            createdAt: e.createdAt,
          }))
        )
      ),
    };

    return NextResponse.json(transformedAsset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
