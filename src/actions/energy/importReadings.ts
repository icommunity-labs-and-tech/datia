'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { scopeWhere } from '@/lib/scope';
import { requireScope } from '@/lib/auth/tenant';
import { recordEvent } from '@/lib/services/events';
import { issueCertification } from '@/lib/certification';
import { companyKycStatus } from '@/lib/kyc/company-status';
import { createEnergyServiceImpl } from '@/domain/energy/EnergyServiceImpl';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';
import { EnergyValidationError, type EnergyCarrier } from '@/domain/energy/EnergyTypes';
import {
  MAX_READINGS_CSV_LENGTH,
  periodKey,
  readReadingsCsv,
  type ReadingsCsvResult,
} from '@/lib/import/readings-csv';

/**
 * Readings by CSV (#147): pick the asset and the source in the panel, the file
 * carries only the readings. Written in bulk, then certified one evidence per
 * month — the split the BMS simulator already makes: readings stay at full
 * detail in the database, and what goes on chain is each month's aggregate.
 */

export interface ImportTargetSource {
  id: string;
  name: string;
  energyCarrier: string;
  renewableShare: number | null;
  gridEmissionFactor: number | null;
}

export interface ImportTarget {
  id: string;
  name: string;
  sources: ImportTargetSource[];
}

/** The company's assets, each with the energy sources readings can go to. */
export async function listImportTargets(): Promise<ImportTarget[]> {
  const scope = await requireScope();
  const assets = await prisma.asset.findMany({
    where: scopeWhere(scope),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      EnergySource: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, energyCarrier: true, renewableShare: true, gridEmissionFactor: true },
      },
    },
  });
  return assets.map((a) => ({ id: a.id, name: a.name, sources: a.EnergySource }));
}

export interface NewSourceInput {
  assetId: string;
  name: string;
  energyCarrier: EnergyCarrier;
  renewableShare: number | null;
  /** kg CO₂e per kWh. */
  gridEmissionFactor: number | null;
}

export async function createImportSource(
  input: NewSourceInput
): Promise<{ ok: true; source: ImportTargetSource } | { ok: false; error: string }> {
  const scope = await requireScope();
  const asset = await prisma.asset.findFirst({ where: { id: input.assetId, ...scopeWhere(scope) }, select: { id: true } });
  if (!asset) return { ok: false, error: 'asset_not_found' };
  if (input.gridEmissionFactor != null && input.gridEmissionFactor < 0) return { ok: false, error: 'negative_factor' };

  try {
    const s = await createEnergyServiceImpl({ energyRepository }).createSource(scope, {
      assetId: asset.id,
      name: input.name.trim(),
      energyCarrier: input.energyCarrier,
      renewableShare: input.renewableShare ?? undefined,
      gridEmissionFactor: input.gridEmissionFactor ?? undefined,
    });
    return {
      ok: true,
      source: {
        id: s.id,
        name: s.name,
        energyCarrier: s.energyCarrier,
        renewableShare: s.renewableShare,
        gridEmissionFactor: s.gridEmissionFactor,
      },
    };
  } catch (err) {
    if (err instanceof EnergyValidationError) return { ok: false, error: err.message };
    throw err;
  }
}

async function ownSource(sourceId: string) {
  const scope = await requireScope();
  const source = await prisma.energySource.findFirst({
    where: { id: sourceId, Asset: scopeWhere(scope) },
    select: {
      id: true,
      name: true,
      energyCarrier: true,
      gridEmissionFactor: true,
      Asset: { select: { id: true, name: true, companyId: true } },
    },
  });
  return { scope, source };
}

/** Readings already stored for the source, keyed by period, and whether each is on chain. */
async function storedReadings(sourceId: string) {
  const stored = await prisma.energyConsumption.findMany({
    where: { energySourceId: sourceId },
    select: { id: true, periodStart: true, periodEnd: true, EmissionRecord: { select: { certificationId: true } } },
  });
  return new Map(
    stored.map((c) => [
      periodKey(c.periodStart, c.periodEnd),
      {
        id: c.id,
        state: (c.EmissionRecord.some((e) => e.certificationId) ? 'certified' : 'uncertified') as
          | 'certified'
          | 'uncertified',
      },
    ])
  );
}

async function read(sourceId: string, text: string) {
  const { scope, source } = await ownSource(sourceId);
  if (!source) return { scope, source, stored: null, result: null };
  if (text.length > MAX_READINGS_CSV_LENGTH) {
    return { scope, source, stored: null, result: { fileIssues: [{ code: 'too_large' as const }], rows: [] } };
  }
  const stored = await storedReadings(source.id);
  const result = readReadingsCsv(text, {
    source,
    existing: new Map([...stored].map(([k, v]) => [k, v.state])),
  });
  return { scope, source, stored, result };
}

/** What a file would write for a source, without writing anything. */
export async function previewReadingsCsv(sourceId: string, text: string): Promise<ReadingsCsvResult | null> {
  return (await read(sourceId, text)).result;
}

export interface ImportReadingsResult {
  created: number;
  replaced: number;
  skipped: number;
  /** Emission ids per month (YYYY-MM), to be certified one evidence each. */
  months: Array<{ month: string; emissionIds: string[] }>;
}

/**
 * Writes a file's valid readings and their emissions. A reading for a period
 * already stored is skipped — or, with `replaceUncertified`, replaced if none
 * of its emissions is on chain yet. What is certified is never rewritten.
 * The file is read again here rather than trusting rows from the browser.
 */
export async function importReadings(
  sourceId: string,
  text: string,
  { replaceUncertified = false }: { replaceUncertified?: boolean } = {}
): Promise<ImportReadingsResult | null> {
  const { scope, source, stored, result } = await read(sourceId, text);
  if (!source || !stored || !result || result.fileIssues.length) return null;

  const valid = result.rows.filter((r) => r.issues.length === 0);
  const toReplace = replaceUncertified ? valid.filter((r) => r.existing === 'uncertified') : [];
  const toWrite = valid.filter((r) => r.existing === null || toReplace.includes(r));

  const written = await prisma.$transaction(async (tx) => {
    if (toReplace.length) {
      // Emissions go with their reading (onDelete: Cascade).
      await tx.energyConsumption.deleteMany({
        where: { id: { in: toReplace.map((r) => stored.get(periodKey(r.periodStart, r.periodEnd))!.id) } },
      });
    }
    const consumptions = await tx.energyConsumption.createManyAndReturn({
      data: toWrite.map((r) => ({
        energySourceId: source.id,
        periodStart: new Date(r.periodStart),
        periodEnd: new Date(r.periodEnd),
        consumptionKwh: r.kwh,
        consumptionMj: Math.round(r.kwh * 3.6 * 100) / 100,
        lifecycleStage: r.stage,
        operatingConditions: { origin: 'csv' },
      })),
      select: { id: true, periodStart: true, periodEnd: true },
    });

    // Paired by period, not by position: a batch does not promise to keep its order.
    const byPeriod = new Map(toWrite.map((r) => [periodKey(r.periodStart, r.periodEnd), r]));
    const emissions = await tx.emissionRecord.createManyAndReturn({
      data: consumptions.flatMap((c) => {
        const r = byPeriod.get(periodKey(c.periodStart, c.periodEnd))!;
        return r.co2eKg == null
          ? []
          : [
              {
                energyConsumptionId: c.id,
                co2eKg: r.co2eKg,
                scope: r.scope,
                systemBoundary: 'GATE_TO_GATE' as const,
                emissionFactor: r.factor,
                emissionFactorSource: r.factor != null ? 'Factor de la fuente de energía' : null,
                calculationMethodology: 'GHG Protocol',
                gwpCharacterizationFactors: 'IPCC AR6',
                functionalUnit: 'kWh',
              },
            ];
      }),
      select: { id: true, EnergyConsumption: { select: { periodStart: true } } },
    });
    return { consumptions, emissions };
    // A full file — 10,000 readings and their emissions — outlasts the 5 s default.
  }, { timeout: 30_000 });

  const months = new Map<string, string[]>();
  for (const e of written.emissions) {
    const month = e.EnergyConsumption.periodStart.toISOString().slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), e.id]);
  }

  // One event for the file, not one per reading: the registry should stay readable.
  await recordEvent(scope, {
    eventType: 'energy_consumption_event',
    entityType: 'EnergySource',
    entityId: source.id,
    data: {
      sourceId: source.id,
      origin: 'csv',
      readings: written.consumptions.length,
      totalKwh: Math.round(toWrite.reduce((n, r) => n + r.kwh, 0) * 100) / 100,
    },
  });

  revalidatePath('/company/energy/consumption');
  revalidatePath('/company/energy/emissions');
  revalidatePath('/company/assets');

  return {
    created: written.consumptions.length - toReplace.length,
    replaced: toReplace.length,
    skipped: valid.length - toWrite.length,
    months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, emissionIds]) => ({ month, emissionIds })),
  };
}

export type CertifyMonthResult =
  | { ok: true; month: string; evidenceId: string }
  | { ok: false; month: string; reason: 'NOT_VERIFIED' | 'ERROR'; message: string };

/**
 * One evidence for a month of imported readings: the aggregate is what goes on
 * chain. It claims no verifier — an import is not a third-party verification.
 */
export async function certifyImportedMonth(
  sourceId: string,
  month: string,
  emissionIds: string[]
): Promise<CertifyMonthResult> {
  const { scope, source } = await ownSource(sourceId);
  if (!source) return { ok: false, month, reason: 'ERROR', message: 'source_not_found' };

  // The asset's company signs (#23), not whoever is in scope.
  const signature = source.Asset.companyId
    ? await companyKycStatus(source.Asset.companyId)
    : { signatureID: null, verified: false };
  if (!signature.signatureID || !signature.verified) {
    return { ok: false, month, reason: 'NOT_VERIFIED', message: 'kyc' };
  }

  // Only this source's own, still uncertified records: ids come from the browser.
  const own = await prisma.emissionRecord.findMany({
    where: { id: { in: emissionIds }, certificationId: null, EnergyConsumption: { energySourceId: source.id } },
    select: { id: true, co2eKg: true, EnergyConsumption: { select: { consumptionKwh: true, periodStart: true, periodEnd: true } } },
  });
  if (!own.length) return { ok: false, month, reason: 'ERROR', message: 'nothing_to_certify' };

  const totalCo2eKg = Math.round(own.reduce((n, e) => n + e.co2eKg, 0) * 1000) / 1000;
  const totalKwh = Math.round(own.reduce((n, e) => n + e.EnergyConsumption.consumptionKwh, 0) * 100) / 100;
  const starts = own.map((e) => e.EnergyConsumption.periodStart.getTime());
  const ends = own.map((e) => e.EnergyConsumption.periodEnd.getTime());

  try {
    const certification = await issueCertification({
      scope,
      signatureID: signature.signatureID,
      assetId: source.Asset.id,
      title: `Emisiones de ${month} · ${totalCo2eKg} kg CO₂e`,
      description: `${source.Asset.name} · ${source.name} · ${totalKwh} kWh en ${month}, agregados de ${own.length} lecturas importadas por CSV.`,
      payload: {
        emissionRecordIds: own.map((e) => e.id),
        assetName: source.Asset.name,
        sourceName: source.name,
        period: month,
        periodStart: new Date(Math.min(...starts)).toISOString(),
        periodEnd: new Date(Math.max(...ends)).toISOString(),
        readings: own.length,
        totalKwh,
        totalCo2eKg,
        origin: 'csv',
      },
      emissionRecordIds: own.map((e) => e.id),
    });
    return { ok: true, month, evidenceId: certification.evidenceId };
  } catch (err) {
    return { ok: false, month, reason: 'ERROR', message: err instanceof Error ? err.message : String(err) };
  }
}
