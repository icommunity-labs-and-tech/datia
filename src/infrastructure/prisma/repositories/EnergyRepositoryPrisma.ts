import { prisma } from '@/lib/prisma';
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
  installationDate: r.installationDate ?? null,
  renewableShare: r.renewableShare ?? null,
  guaranteeOfOriginId: r.guaranteeOfOriginId ?? null,
  countryOfOrigin: r.countryOfOrigin ?? null,
  gridEmissionFactor: r.gridEmissionFactor ?? null,
  itemId: r.itemId,
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

// Org filter travels through the relation chain — no organizationId on energy models
const orgViaItem = (organizationId: string) => ({ Item: { organizationId } });
const orgViaSource = (organizationId: string) => ({ EnergySource: orgViaItem(organizationId) });
const orgViaConsumption = (organizationId: string) => ({ EnergyConsumption: orgViaSource(organizationId) });

export const energyRepository: EnergyRepository = {
  async createSource(organizationId, input: CreateEnergySourceInput) {
    const r = await prisma.energySource.create({
      data: {
        name: input.name,
        energyCarrier: input.energyCarrier,
        generationTechnology: input.generationTechnology ?? null,
        capacityKw: input.capacityKw ?? null,
        location: input.location ?? null,
        installationDate: input.installationDate ?? null,
        renewableShare: input.renewableShare ?? null,
        guaranteeOfOriginId: input.guaranteeOfOriginId ?? null,
        countryOfOrigin: input.countryOfOrigin ?? null,
        gridEmissionFactor: input.gridEmissionFactor ?? null,
        itemId: input.itemId,
      },
    });
    return toSource(r);
  },

  async findSourcesByOrganization(organizationId, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.energySource.findMany({
      where: orgViaItem(organizationId),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toSource), pagination?.limit ?? limit);
  },

  async findSourceById(organizationId, id) {
    const r = await prisma.energySource.findFirst({
      where: { id, ...orgViaItem(organizationId) },
    });
    return r ? toSource(r) : null;
  },

  async createConsumption(organizationId, input: CreateEnergyConsumptionInput) {
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

  async findConsumptionByOrganization(organizationId, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.energyConsumption.findMany({
      where: orgViaSource(organizationId),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toConsumption), pagination?.limit ?? limit);
  },

  async findConsumptionById(organizationId, id) {
    const r = await prisma.energyConsumption.findFirst({
      where: { id, ...orgViaSource(organizationId) },
    });
    return r ? toConsumption(r) : null;
  },

  async createEmission(organizationId, input: CreateEmissionRecordInput) {
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

  async findEmissionsByOrganization(organizationId, limit = 20, pagination?: CursorPaginationParams) {
    const take = (pagination?.limit ?? limit) + 1;
    const rows = await prisma.emissionRecord.findMany({
      where: orgViaConsumption(organizationId),
      orderBy: { createdAt: 'desc' },
      ...(pagination?.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
      take,
    });
    return createPaginationResponse(rows.map(toEmission), pagination?.limit ?? limit);
  },

  async findEmissionById(organizationId, id) {
    const r = await prisma.emissionRecord.findFirst({
      where: { id, ...orgViaConsumption(organizationId) },
    });
    return r ? toEmission(r) : null;
  },
};
