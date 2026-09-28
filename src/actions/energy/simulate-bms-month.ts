'use server';

import { requireScope } from '@/lib/auth/tenant';
import { recordEvent } from '@/lib/services/events';
import { BMS_MONTH_NAMES } from '@/lib/energy/bmsMonthNames';
import {
  bmsDailyKwh,
  bmsDaysInMonth,
  bmsSensorReadings,
  resolveBmsProfile,
  type BmsProfileId,
} from '@/lib/energy/bmsProfiles';
import { prisma } from '@/lib/prisma';
import { issueCertification } from '@/lib/certification';
import { companyKycStatus } from '@/lib/kyc/company-status';
import { scopeWhere } from '@/lib/scope';

/**
 * A month of daily BMS readings.
 *
 * Metering daily and anchoring monthly is the split a real deployment needs:
 * sensors report far finer than anything worth putting on chain. Certifying
 * every reading would cost one transaction per day per asset — 365 a year, and
 * 8760 if the meter reported hourly — so the readings stay in the database at
 * full detail and a single evidence per month carries the aggregate an auditor
 * signs.
 *
 * Each daily reading still gets its own emission record, so the chain
 * consumption → emission the ESPR model requires is never broken; what is
 * aggregated is the proof, not the data.
 */

export interface BmsMonthResult {
  monthIndex: number;
  month: string;
  /** Daily readings that make up the month. */
  days: number;
  totalKwh: number;
  totalCo2eKg: number;
  /** Emission ids of the month, to be certified as one aggregate. */
  emissionIds: string[];
  /** True when the month was already metered by an earlier run. */
  reused: boolean;
}

export async function createBmsMonthReadings(
  sourceId: string,
  year: number,
  monthIndex: number,
  profileId?: BmsProfileId
): Promise<BmsMonthResult> {
  const scope = await requireScope();
  const profile = resolveBmsProfile(profileId);

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
  const days = bmsDaysInMonth(year, monthIndex);

  // A month already metered is not metered again: reading the same days twice
  // would double the annual total.
  const existing = await prisma.energyConsumption.findMany({
    where: {
      energySourceId: sourceId,
      periodStart: { gte: monthStart, lte: monthEnd },
      EnergySource: { Asset: scopeWhere(scope) },
    },
    select: { id: true, consumptionKwh: true, EmissionRecord: { select: { id: true, co2eKg: true } } },
  });

  if (existing.length) {
    return {
      monthIndex,
      month: BMS_MONTH_NAMES[monthIndex],
      days: existing.length,
      totalKwh: round(existing.reduce((s, c) => s + c.consumptionKwh, 0)),
      totalCo2eKg: round(existing.reduce((s, c) => s + sum(c.EmissionRecord.map((e) => e.co2eKg)), 0), 3),
      emissionIds: existing.flatMap((c) => c.EmissionRecord.map((e) => e.id)),
      reused: true,
    };
  }

  // Written in two batches rather than day by day. At ~50 ms per round trip,
  // 31 readings and their 31 emissions one at a time cost over three seconds a
  // month — more than the month's own slot in the run. Batched, it is two.
  const readings = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const periodEnd = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59));
    const kwh = bmsDailyKwh(profile, year, monthIndex, day);
    return {
      periodStart: new Date(Date.UTC(year, monthIndex, day)),
      periodEnd,
      kwh,
      co2eKg: round(kwh * profile.emissionFactor, 3),
    };
  });

  const consumptions = await prisma.energyConsumption.createManyAndReturn({
    data: readings.map((r) => ({
      energySourceId: sourceId,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      consumptionKwh: r.kwh,
      consumptionMj: round(r.kwh * 3.6),
      lifecycleStage: 'USE' as const,
      measurementStandard: profile.measurementStandard,
      operatingConditions: {
        profile: profile.id,
        granularity: 'daily',
        ...bmsSensorReadings(profile, monthIndex, r.kwh),
      },
      createdAt: r.periodEnd,
    })),
    select: { id: true, periodStart: true },
  });

  // Pair each emission with its reading by period, not by array position:
  // the batch does not promise to come back in the order it went in.
  const byPeriod = new Map(readings.map((r) => [r.periodStart.getTime(), r]));

  const emissions = await prisma.emissionRecord.createManyAndReturn({
    data: consumptions.map((c) => {
      const reading = byPeriod.get(c.periodStart.getTime());
      return {
        energyConsumptionId: c.id,
        co2eKg: reading?.co2eKg ?? 0,
        scope: profile.scope,
        systemBoundary: profile.systemBoundary,
        emissionFactor: profile.emissionFactor,
        emissionFactorSource: profile.emissionFactorSource,
        calculationMethodology: profile.calculationMethodology,
        gwpCharacterizationFactors: 'IPCC AR6',
        functionalUnit: 'kWh',
        createdAt: reading?.periodEnd ?? new Date(),
      };
    }),
    select: { id: true },
  });

  const emissionIds = emissions.map((e) => e.id);
  const totalKwh = sum(readings.map((r) => r.kwh));
  const totalCo2eKg = sum(readings.map((r) => r.co2eKg));

  // One event for the month, not 365: the registry should stay readable.
  await recordEvent(scope, {
    eventType: 'energy_consumption_event',
    entityType: 'EnergySource',
    entityId: sourceId,
    data: {
      sourceId,
      month: BMS_MONTH_NAMES[monthIndex],
      year,
      granularity: 'daily',
      readings: days,
      totalKwh: round(totalKwh),
    },
  });

  return {
    monthIndex,
    month: BMS_MONTH_NAMES[monthIndex],
    days,
    totalKwh: round(totalKwh),
    totalCo2eKg: round(totalCo2eKg, 3),
    emissionIds,
    reused: false,
  };
}

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
const round = (value: number, decimals = 2) => parseFloat(value.toFixed(decimals));

// ── Monthly certification ───────────────────────────────────────────────────
//
// One evidence per month, carrying the aggregate of its daily readings. The
// individual readings stay in the database at full detail; what goes on chain
// is the figure an auditor signs, with enough context to be attributable: which
// asset, which source, which period, how many readings, how much energy and by
// what factor it became CO₂e.

export type BmsMonthCertification =
  | {
      ok: true;
      evidenceId: string;
      certificationId: string;
      monthIndex: number;
      period: string;
      totalKwh: number;
      totalCo2eKg: number;
      readings: number;
      verifierBody: string;
    }
  | { ok: false; monthIndex: number; reason: 'NOT_VERIFIED' | 'ERROR'; message: string };

export async function certifyBmsMonth(
  sourceId: string,
  year: number,
  monthIndex: number,
  emissionIds: string[]
): Promise<BmsMonthCertification> {
  const scope = await requireScope();

  const source = await prisma.energySource.findFirst({
    where: { id: sourceId, Asset: scopeWhere(scope) },
    select: { id: true, name: true, Asset: { select: { id: true, name: true, companyId: true } } },
  });
  if (!source) {
    return { ok: false, monthIndex, reason: 'ERROR', message: 'Fuente de energía no encontrada.' };
  }

  // La empresa del activo es quien firma, no la del scope (#23): un token de
  // organización abarca varias empresas.
  const signature = source.Asset.companyId
    ? await companyKycStatus(source.Asset.companyId)
    : { signatureID: null, verified: false };
  if (!signature.signatureID || !signature.verified) {
    return {
      ok: false,
      monthIndex,
      reason: 'NOT_VERIFIED',
      message:
        'La empresa no ha completado el KYC — sin ello no se puede anclar evidencia real en blockchain.',
    };
  }

  const period = `${BMS_MONTH_NAMES[monthIndex]} ${year}`;
  const verifierBody = 'AENOR';
  const verificationStandard = 'ISO 14064-3';

  // The ids come from the client: only this source's records count, so a proof
  // can never cover — and later verify — another organisation's emissions.
  const ownIds = (
    await prisma.emissionRecord.findMany({
      where: { id: { in: emissionIds }, EnergyConsumption: { energySourceId: source.id } },
      select: { id: true },
    })
  ).map((e) => e.id);
  if (!ownIds.length) {
    return { ok: false, monthIndex, reason: 'ERROR', message: 'No hay lecturas de esta fuente que certificar.' };
  }

  // Already covered: keep the existing proof rather than mint a competing one
  // for the same figure.
  const already = await prisma.emissionRecord.findFirst({
    where: { id: { in: ownIds }, certificationId: { not: null } },
    select: { Certification: { select: { id: true, evidenceId: true } } },
  });
  if (already?.Certification) {
    return {
      ok: true,
      evidenceId: already.Certification.evidenceId,
      certificationId: already.Certification.id,
      monthIndex,
      period,
      totalKwh: 0,
      totalCo2eKg: 0,
      readings: 0,
      verifierBody,
    };
  }

  const totals = await prisma.emissionRecord.aggregate({
    where: { id: { in: ownIds } },
    _sum: { co2eKg: true },
    _count: { _all: true },
  });
  const consumption = await prisma.energyConsumption.aggregate({
    where: { EmissionRecord: { some: { id: { in: ownIds } } } },
    _sum: { consumptionKwh: true },
  });

  const totalCo2eKg = parseFloat((totals._sum.co2eKg ?? 0).toFixed(3));
  const totalKwh = parseFloat((consumption._sum.consumptionKwh ?? 0).toFixed(2));
  const readings = totals._count._all;

  const issued = {
    emissionRecordIds: ownIds,
    assetName: source.Asset.name,
    sourceName: source.name,
    period,
    periodStart: new Date(Date.UTC(year, monthIndex, 1)).toISOString(),
    periodEnd: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59)).toISOString(),
    readings,
    granularity: 'daily',
    totalKwh,
    totalCo2eKg,
    verifierBody,
    verificationStandard,
  };

  try {
    const certification = await issueCertification({
      scope,
      signatureID: signature.signatureID,
      assetId: source.Asset.id,
      title: `Emisión certificada — ${period} · ${totalCo2eKg} kg CO₂e`,
      description:
        `${source.Asset.name} · ${source.name} · ${totalKwh} kWh en ${period}, ` +
        `agregados de ${readings} lecturas diarias. Verificada por ${verifierBody} según ${verificationStandard}.`,
      payload: issued,
      emissionRecordIds: ownIds,
    });

    return {
      ok: true,
      evidenceId: certification.evidenceId,
      certificationId: certification.id,
      monthIndex,
      period,
      totalKwh,
      totalCo2eKg,
      readings,
      verifierBody,
    };
  } catch (err) {
    return {
      ok: false,
      monthIndex,
      reason: 'ERROR',
      message: err instanceof Error ? err.message : 'No se pudo anclar la evidencia en blockchain.',
    };
  }
}
