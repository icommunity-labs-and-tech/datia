import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      templateFields: true,
      createdAt: true,
      Organization: { select: { nombre: true, logoUrl: true, brandColorPrimary: true } },
      EnergySource: {
        include: {
          EnergyConsumption: {
            orderBy: { periodStart: 'asc' },
            include: {
              EmissionRecord: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Only expose verified emissions publicly
  const sources = item.EnergySource.map(source => ({
    id: source.id,
    name: source.name,
    energyCarrier: source.energyCarrier,
    generationTechnology: source.generationTechnology,
    capacityKw: source.capacityKw,
    location: source.location,
    renewableShare: source.renewableShare,
    guaranteeOfOriginId: source.guaranteeOfOriginId,
    countryOfOrigin: source.countryOfOrigin,
    gridEmissionFactor: source.gridEmissionFactor,
    installationDate: source.installationDate,
    consumptions: source.EnergyConsumption.map(c => ({
      id: c.id,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      consumptionKwh: c.consumptionKwh,
      consumptionMj: c.consumptionMj,
      lifecycleStage: c.lifecycleStage,
      measurementStandard: c.measurementStandard,
      costAmount: c.costAmount,
      currency: c.currency,
      emissions: c.EmissionRecord.filter(e => e.verificationStatus === 'VERIFIED').map(e => ({
        id: e.id,
        co2eKg: e.co2eKg,
        scope: e.scope,
        systemBoundary: e.systemBoundary,
        emissionFactor: e.emissionFactor,
        emissionFactorSource: e.emissionFactorSource,
        calculationMethodology: e.calculationMethodology,
        gwpCharacterizationFactors: e.gwpCharacterizationFactors,
        functionalUnit: e.functionalUnit,
        verifierBody: e.verifierBody,
        verificationStandard: e.verificationStandard,
        verificationStatus: e.verificationStatus,
        createdAt: e.createdAt,
      })),
    })),
  }));

  // Aggregate KPIs
  const allConsumptions = sources.flatMap(s => s.consumptions);
  const allEmissions = allConsumptions.flatMap(c => c.emissions);
  const totalKwh = allConsumptions.reduce((s, c) => s + c.consumptionKwh, 0);
  const totalCo2e = allEmissions.reduce((s, e) => s + e.co2eKg, 0);
  const avgRenewable = sources.filter(s => s.renewableShare != null).length
    ? sources.filter(s => s.renewableShare != null).reduce((s, r) => s + r.renewableShare!, 0) /
      sources.filter(s => s.renewableShare != null).length
    : null;

  return NextResponse.json({
    item: {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      templateFields: item.templateFields,
      createdAt: item.createdAt,
      organization: item.Organization,
    },
    sources,
    kpis: {
      totalKwh,
      totalCo2eKg: totalCo2e,
      certifiedEmissions: allEmissions.length,
      avgRenewableShare: avgRenewable,
      sourcesCount: sources.length,
    },
  });
}
