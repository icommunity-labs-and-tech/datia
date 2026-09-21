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
    console.log('[API] Looking for item with ID:', code);

    // Buscar el item por ID (asumiendo que el código es el ID del item)
    const item = await prisma.item.findUnique({
      where: {
        id: code,
      },
      include: {
        Organization: {
          select: {
            nombre: true,
            logoUrl: true,
            brandColorPrimary: true,
          },
        },
        ItemCategory: {
          include: {
            Category: true
          }
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

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Transformar los datos para el frontend
    const transformedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      templateFields: item.templateFields,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      evidenceID: item.evidenceID || null,
      createdBy: item.User || null,
      organization: item.Organization
        ? {
            name: item.Organization.nombre,
            logoUrl: item.Organization.logoUrl,
            brandColorPrimary: item.Organization.brandColorPrimary,
          }
        : null,
      category: item.ItemCategory.length > 0 ? {
        id: item.ItemCategory[0].Category.id,
        name: item.ItemCategory[0].Category.name,
        description: item.ItemCategory[0].Category.description,
      } : {
        id: '',
        name: 'Sin categoría',
        description: '',
      },
      energyCertifications: item.EnergySource.flatMap((src) =>
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

    return NextResponse.json(transformedItem);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
