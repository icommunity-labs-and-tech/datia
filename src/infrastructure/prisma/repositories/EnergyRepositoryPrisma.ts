import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';
import type { EnergyRepository } from '@/domain/energy/EnergyRepository';
import { createPaginationResponse, type CursorPaginationParams } from '@/lib/api/cursor-pagination';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  CreateEnergySourceInput,
  CreateEnergyConsumptionInput,
  CreateEmissionRecordInput,
} from '@/domain/energy/EnergyTypes';

const toSource = (r: any): EnergySourceRecord => ({
  id: r.id,
  name: r.name,
  energyCarrier: r.energyCarrier,
  generationTechnology: r.generationTechnology ?? null,
  capacityKw: r.capacityKw ?? null,
  location: r.location ?? null,
  latitude: r.latitude ?? null,
  longitude: r.longitude ?? null,
  installationDate: r.installationDate ?? null,
  renewableShare: r.renewableShare ?? null,
  guaranteeOfOriginId: r.guaranteeOfOriginId ?? null,
  countryOfOrigin: r.countryOfOrigin ?? null,
  gridEmissionFactor: r.gridEmissionFactor ?? null,
  assetId: r.assetId,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const toConsumption = (r: any): EnergyConsumptionRecord => ({
  id: r.id,
  energySourceId: r.energySourceId,
  periodStart: r.periodStart,
  periodEnd: r.periodEnd,
  consumptionKwh: r.consumptionKwh,
  consumptionMj: r.consumptionMj ?? null,
  lifecycleStage: r.lifecycleStage,
  measurementStandard: r.measurementStandard ?? null,
  operatingConditions: r.operatingConditions ?? null,
  costAmount: r.costAmount ?? null,
  currency: r.currency ?? null,
  createdAt: r.createdAt,
});

const toEmission = (r: any): EmissionRecord => ({
  id: r.id,
  energyConsumptionId: r.energyConsumptionId,
  co2eKg: r.co2eKg,
  scope: r.scope,
  systemBoundary: r.systemBoundary,
  emissionFactor: r.emissionFactor ?? null,
  emissionFactorSource: r.emissionFactorSource ?? null,
  calculationMethodology: r.calculationMethodology ?? null,
  gwpCharacterizationFactors: r.gwpCharacterizationFactors ?? null,
  functionalUnit: r.functionalUnit ?? null,
  verificationStatus: r.verificationStatus,
  verifierBody: r.verifierBody ?? null,
  verificationStandard: r.verificationStandard ?? null,
  createdAt: r.createdAt,
});

// The scope travels through the relation chain — no organizationId or companyId on energy models
const orgViaItem = (scope: Scope) => ({ Asset: scopeWhere(scope) });
const orgViaSource = (scope: Scope) => ({ EnergySource: orgViaItem(scope) });
const orgViaConsumption = (scope: Scope) => ({ EnergyConsumption: orgViaSource(scope) });


/** Groups rows into a YYYY-MM series so the client formats the label locally. */
function toMonthlySeries<T>(
  rows: T[],
  getDate: (row: T) => Date,
  getValue: (row: T) => number
) {
  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const date = getDate(row);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(month, (byMonth.get(month) ?? 0) + getValue(row));
  }
  // Sorted by the month itself: rows arrive ordered by creation date, which is
  // not the same order as the period they measure.
  return [...byMonth]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));
}

export const energyRepository: EnergyRepository = {
  async createSource(scope, input: CreateEnergySourceInput) {
    const r = await prisma.energySource.create({
      data: {
        name: input.name,
        energyCarrier: input.energyCarrier,
        generationTechnology: input.generationTechnology ?? null,
        capacityKw: input.capacityKw ?? null,
        location: input.location ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        installationDate: input.installationDate ?? null,
        renewableShare: input.renewableShare ?? null,
        guaranteeOfOriginId: input.guaranteeOfOriginId ?? null,
        countryOfOrigin: input.countryOfOrigin ?? null,
        gridEmissionFactor: input.gridEmissionFactor ?? null,
        assetId: input.assetId,
      },
    });
    return toSource(r);
  },

  async findSourcesByOrganization(scope, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.energySource.findMany({
      where: orgViaItem(scope),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toSource), pagination?.limit ?? limit);
  },

  async findSourceById(scope, id) {
    const r = await prisma.energySource.findFirst({
      where: { id, ...orgViaItem(scope) },
    });
    return r ? toSource(r) : null;
  },

  async createConsumption(scope, input: CreateEnergyConsumptionInput) {
    const r = await prisma.energyConsumption.create({
      data: {
        energySourceId: input.energySourceId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        consumptionKwh: input.consumptionKwh,
        consumptionMj: input.consumptionMj ?? null,
        lifecycleStage: input.lifecycleStage,
        measurementStandard: input.measurementStandard ?? null,
        operatingConditions: input.operatingConditions ? (input.operatingConditions as object) : undefined,
        costAmount: input.costAmount ?? null,
        currency: input.currency ?? null,
      },
    });
    return toConsumption(r);
  },

  async findConsumptionByOrganization(scope, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.energyConsumption.findMany({
      where: orgViaSource(scope),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toConsumption), pagination?.limit ?? limit);
  },

  async findConsumptionById(scope, id) {
    const r = await prisma.energyConsumption.findFirst({
      where: { id, ...orgViaSource(scope) },
    });
    return r ? toConsumption(r) : null;
  },

  async createEmission(scope, input: CreateEmissionRecordInput) {
    const r = await prisma.emissionRecord.create({
      data: {
        energyConsumptionId: input.energyConsumptionId,
        co2eKg: input.co2eKg,
        scope: input.scope,
        systemBoundary: input.systemBoundary,
        emissionFactor: input.emissionFactor ?? null,
        emissionFactorSource: input.emissionFactorSource ?? null,
        calculationMethodology: input.calculationMethodology ?? null,
        gwpCharacterizationFactors: input.gwpCharacterizationFactors ?? null,
        functionalUnit: input.functionalUnit ?? null,
        verifierBody: input.verifierBody ?? null,
        verificationStandard: input.verificationStandard ?? null,
      },
    });
    return toEmission(r);
  },

  async findEmissionsByOrganization(scope, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.emissionRecord.findMany({
      where: orgViaConsumption(scope),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toEmission), pagination?.limit ?? limit);
  },

  async findEmissionById(scope, id) {
    const r = await prisma.emissionRecord.findFirst({
      where: { id, ...orgViaConsumption(scope) },
    });
    return r ? toEmission(r) : null;
  },

  /**
   * Aggregates over every record of the organisation. The listing methods above
   * are paginated on purpose; these totals are what the summary must show, so
   * the figure on screen is never a page total wearing the label of a real one.
   */
  async getConsumptionTotals(scope) {
    const where = orgViaSource(scope);
    const [aggregate, rows] = await Promise.all([
      prisma.energyConsumption.aggregate({ where, _count: true, _sum: { consumptionKwh: true } }),
      prisma.energyConsumption.findMany({
        where,
        select: { periodStart: true, consumptionKwh: true },
        orderBy: { periodStart: 'asc' },
      }),
    ]);

    return {
      records: aggregate._count,
      totalKwh: aggregate._sum.consumptionKwh ?? 0,
      monthly: toMonthlySeries(rows, (r) => r.periodStart, (r) => r.consumptionKwh),
    };
  },

  async getEmissionTotals(scope) {
    const where = orgViaConsumption(scope);
    const [aggregate, verified, rows] = await Promise.all([
      prisma.emissionRecord.aggregate({ where, _count: true, _sum: { co2eKg: true } }),
      prisma.emissionRecord.count({ where: { ...where, verificationStatus: 'VERIFIED' } }),
      // Grouped by the period the emission measures, not by when the record was
      // written: otherwise a bulk import collapses the whole series into one month.
      prisma.emissionRecord.findMany({
        where,
        select: {
          co2eKg: true,
          createdAt: true,
          EnergyConsumption: { select: { periodStart: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      records: aggregate._count,
      verified,
      totalCo2eKg: aggregate._sum.co2eKg ?? 0,
      monthly: toMonthlySeries(
        rows,
        (r) => r.EnergyConsumption?.periodStart ?? r.createdAt,
        (r) => r.co2eKg
      ),
    };
  },

  async getSourceMonthlySeries(scope) {
    const [sources, consumptionRows, emissionRows] = await Promise.all([
      prisma.energySource.findMany({ where: orgViaItem(scope), select: { id: true, name: true } }),
      prisma.energyConsumption.findMany({
        where: orgViaSource(scope),
        select: { energySourceId: true, periodStart: true, consumptionKwh: true },
      }),
      // The factor "vigente" for a source is the one on its most recent
      // consumption's emission record — the data volumes here are small enough
      // that picking the max in JS beats a second grouped query per source.
      prisma.emissionRecord.findMany({
        where: orgViaConsumption(scope),
        select: {
          emissionFactor: true,
          EnergyConsumption: { select: { energySourceId: true, periodStart: true } },
        },
      }),
    ]);

    const consumptionBySource = new Map<string, typeof consumptionRows>();
    for (const row of consumptionRows) {
      const list = consumptionBySource.get(row.energySourceId) ?? [];
      list.push(row);
      consumptionBySource.set(row.energySourceId, list);
    }

    const latestFactorBySource = new Map<string, { periodStart: Date; factor: number | null }>();
    for (const row of emissionRows) {
      const sourceId = row.EnergyConsumption?.energySourceId;
      const periodStart = row.EnergyConsumption?.periodStart;
      if (!sourceId || !periodStart) continue;
      const current = latestFactorBySource.get(sourceId);
      if (!current || periodStart > current.periodStart) {
        latestFactorBySource.set(sourceId, { periodStart, factor: row.emissionFactor ?? null });
      }
    }

    return sources.map((source) => ({
      sourceId: source.id,
      sourceName: source.name,
      monthly: toMonthlySeries(
        consumptionBySource.get(source.id) ?? [],
        (r) => r.periodStart,
        (r) => r.consumptionKwh
      ),
      currentEmissionFactor: latestFactorBySource.get(source.id)?.factor ?? null,
    }));
  },
};
