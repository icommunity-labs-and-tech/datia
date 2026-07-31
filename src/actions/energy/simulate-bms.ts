'use server';

import { randomUUID } from 'crypto';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { BMS_MONTH_NAMES } from '@/lib/energy/bmsMonthNames';
import { prisma } from '@/lib/prisma';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';

// IEA Spain 2023 grid emission factor for SCOPE_2 electricity (kgCO2e/kWh)
const EMISSION_FACTOR = 0.233;
const EMISSION_FACTOR_SOURCE = 'IEA Spain 2023';

// Base monthly consumption (kWh) for a mid-size industrial asset
const BASE_KWH = 8_500;

// Seasonal multipliers — based on REE demand patterns for Spain
// Peaks in Jan/Feb (heating) and Jul/Aug (cooling)
const SEASONAL = [1.10, 1.05, 0.95, 0.88, 0.85, 0.92, 1.15, 1.12, 0.95, 0.90, 0.98, 1.08];

// ±5% random noise to make readings look real
function withNoise(value: number): number {
  return parseFloat((value * (0.95 + Math.random() * 0.10)).toFixed(2));
}

/**
 * Simulates a realistic year of BMS energy readings for an item, split into
 * granular server actions (one per phase / month) so the frontend can drive
 * a step-by-step animated reveal instead of a single opaque call — mirrors
 * scripts/simulate-bms.ts but calls domain services directly instead of the
 * public REST API.
 */

// ── Step 1: energy source ───────────────────────────────────────────────────

export interface BmsSourceResult {
  sourceId: string;
  sourceName: string;
  organizationId: string;
}

export async function createBmsSource(itemId: string, year: number): Promise<BmsSourceResult> {
  if (!itemId) throw new Error('Activo requerido');

  const organizationId = await requireOrganizationId();
  const item = await itemRepository.getById(itemId, organizationId);
  if (!item) throw new Error('Activo no encontrado');

  const service = createEnergyServiceImpl({ energyRepository });

  const source = await service.createSource(organizationId, {
    name: `Red eléctrica — Simulación BMS ${year}`,
    energyCarrier: 'ELECTRICITY',
    generationTechnology: 'Grid',
    countryOfOrigin: 'ES',
    gridEmissionFactor: EMISSION_FACTOR,
    itemId,
  });

  await eventRepository.create(organizationId, {
    eventType: 'energy_source_event',
    entityType: 'EnergySource',
    entityId: source.id,
    data: { sourceId: source.id, name: source.name, energyCarrier: source.energyCarrier, itemId },
  });

  return { sourceId: source.id, sourceName: source.name, organizationId };
}

// ── Step 2: one month of consumption ────────────────────────────────────────

export interface BmsConsumptionMonthResult {
  consumptionId: string;
  month: string;
  monthIndex: number;
  kwh: number;
}

export async function createBmsMonthConsumption(
  sourceId: string,
  year: number,
  monthIndex: number
): Promise<BmsConsumptionMonthResult> {
  const organizationId = await requireOrganizationId();
  const service = createEnergyServiceImpl({ energyRepository });

  const kwh = withNoise(BASE_KWH * SEASONAL[monthIndex]);
  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  const consumption = await service.createConsumption(organizationId, {
    energySourceId: sourceId,
    periodStart,
    periodEnd,
    consumptionKwh: kwh,
    consumptionMj: parseFloat((kwh * 3.6).toFixed(2)),
    lifecycleStage: 'USE',
    measurementStandard: 'IEC 62053',
    operatingConditions: { season: SEASONAL[monthIndex] >= 1.0 ? 'peak' : 'off-peak' },
  });

  await eventRepository.create(organizationId, {
    eventType: 'energy_consumption_event',
    entityType: 'EnergyConsumption',
    entityId: consumption.id,
    data: { consumptionId: consumption.id, sourceId, kwh, month: BMS_MONTH_NAMES[monthIndex] },
  });

  return { consumptionId: consumption.id, month: BMS_MONTH_NAMES[monthIndex], monthIndex, kwh };
}

// ── Step 3: one month of emissions ──────────────────────────────────────────

export interface BmsEmissionMonthResult {
  emissionId: string;
  month: string;
  monthIndex: number;
  co2eKg: number;
}

export async function createBmsMonthEmission(
  consumptionId: string,
  monthIndex: number,
  kwh: number
): Promise<BmsEmissionMonthResult> {
  const organizationId = await requireOrganizationId();
  const service = createEnergyServiceImpl({ energyRepository });

  const co2eKg = parseFloat((kwh * EMISSION_FACTOR).toFixed(3));

  const emission = await service.createEmission(organizationId, {
    energyConsumptionId: consumptionId,
    co2eKg,
    scope: 'SCOPE_2',
    systemBoundary: 'CRADLE_TO_GATE',
    emissionFactor: EMISSION_FACTOR,
    emissionFactorSource: EMISSION_FACTOR_SOURCE,
    calculationMethodology: 'GHG Protocol Corporate Standard',
    gwpCharacterizationFactors: 'IPCC AR6',
    functionalUnit: 'kWh',
  });

  await eventRepository.create(organizationId, {
    eventType: 'co2_emission_event',
    entityType: 'EmissionRecord',
    entityId: emission.id,
    data: { id: emission.id, co2eKg, energyConsumptionId: consumptionId },
  });

  return { emissionId: emission.id, month: BMS_MONTH_NAMES[monthIndex], monthIndex, co2eKg };
}

// ── Step 5: certify one representative emission on blockchain ──────────────
//
// Reuses the same evidence pipeline as POST /api/v1/emissions/:id/certify
// (State + iCommunity iBS evidence anchoring), but as a plain server action
// for the dashboard-authenticated demo flow. Kept separate from that route
// rather than sharing code with it, since the route is HTTP-specific and
// already covered by its own test suite.

const CERTIFICATION_STATUS_TYPE_NAME = 'Certificación Energética';

export type BmsCertificationResult =
  | {
      ok: true;
      evidenceID: string;
      stateId: string;
      checkerUrl: string;
      verifierBody: string;
    }
  | {
      ok: false;
      reason: 'NOT_VERIFIED' | 'ERROR';
      message: string;
    };

export async function certifyBmsEmission(emissionId: string): Promise<BmsCertificationResult> {
  const organizationId = await requireOrganizationId();

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { signatureID: true, verificationStatus: true },
  });

  if (!org?.signatureID || org.verificationStatus !== 'VERIFIED') {
    return {
      ok: false,
      reason: 'NOT_VERIFIED',
      message: 'La organización no ha completado el KYC — sin ello no se puede anclar evidencia real en blockchain.',
    };
  }

  const emission = await prisma.emissionRecord.findFirst({
    where: { id: emissionId, EnergyConsumption: { EnergySource: { Item: { organizationId } } } },
    include: { EnergyConsumption: { include: { EnergySource: { include: { Item: true } } } } },
  });
  if (!emission) {
    return { ok: false, reason: 'ERROR', message: 'Registro de emisión no encontrado.' };
  }

  const item = emission.EnergyConsumption.EnergySource.Item;
  const verifierBody = 'AENOR';
  const verificationStandard = 'ISO 14064-3';

  let statusType = await prisma.statusType.findFirst({
    where: { organizationId, name: CERTIFICATION_STATUS_TYPE_NAME },
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
          { label: 'Organismo verificador', name: 'verifierBody', type: 'text' },
        ],
        organizationId,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
  }

  const state = await prisma.state.create({
    data: {
      id: randomUUID(),
      itemId: item.id,
      statusTypeId: statusType.id,
      title: `Certificación Energética — ${emission.co2eKg} kg CO₂e`,
      description: `Emisión certificada por ${verifierBody} según ${verificationStandard}`,
      evidenceID: 'pending',
      backed: false,
      templateConfig: {
        co2eKg: emission.co2eKg,
        scope: emission.scope,
        systemBoundary: emission.systemBoundary,
        verifierBody,
        verificationStandard,
      },
    },
  });

  try {
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const certifiedAt = new Date().toISOString();
    const evidenceID = await evidenceService.createStateEvidence({
      signatureID: org.signatureID,
      title: state.title,
      description: state.description ?? '',
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
          emissionFactorSource: emission.emissionFactorSource ?? '',
          verifierBody,
          verificationStandard,
          certifiedAt,
        },
      },
    });

    await prisma.state.update({
      where: { id: state.id },
      data: { evidenceID, backed: true, backedAt: new Date() },
    });
    await prisma.emissionRecord.update({
      where: { id: emission.id },
      data: { verificationStatus: 'VERIFIED', verifierBody, verificationStandard },
    });
    await eventRepository.create(organizationId, {
      eventType: 'co2_certification_event',
      entityType: 'EmissionRecord',
      entityId: emission.id,
      data: { emissionRecordId: emission.id, stateId: state.id, evidenceID, itemId: item.id },
    });

    return {
      ok: true,
      evidenceID,
      stateId: state.id,
      checkerUrl: `https://checker.icommunitylabs.com/lookup/${evidenceID}`,
      verifierBody,
    };
  } catch (err) {
    await prisma.state.delete({ where: { id: state.id } }).catch(() => null);
    return {
      ok: false,
      reason: 'ERROR',
      message: err instanceof Error ? err.message : 'No se pudo anclar la evidencia en blockchain.',
    };
  }
}
