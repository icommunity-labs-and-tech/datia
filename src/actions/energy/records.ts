'use server';

import { prisma } from '@/lib/prisma';
import { scopeWhere } from '@/lib/scope';
import { requireScope } from '@/lib/auth/tenant';

/**
 * The record tables of the consumption and emissions pages, a page at a time
 * and narrowed by asset and month: a meter that reports daily writes 365 rows a
 * year, and what someone looks for is "the boiler in January", not page seven.
 */

const RECORDS_PAGE_SIZE = 25;

export interface RecordsQuery {
  page: number;
  assetId?: string | null;
  /** YYYY-MM, by the period the record measures. */
  month?: string | null;
}

export interface RecordsPage<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConsumptionRecordRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  consumptionKwh: number;
  lifecycleStage: string;
  source: string;
  assetId: string;
  asset: string;
}

export interface EmissionRecordRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  co2eKg: number;
  scope: string;
  verificationStatus: string;
  emissionFactor: number | null;
  certified: boolean;
  source: string;
  assetId: string;
  asset: string;
}

function monthRange(month?: string | null) {
  const m = month?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return undefined;
  const [y, mo] = [+m[1], +m[2]];
  return { gte: new Date(Date.UTC(y, mo - 1, 1)), lt: new Date(Date.UTC(y, mo, 1)) };
}

const pageOf = (page: number) => Math.max(1, Math.floor(page) || 1);

export async function listConsumptionRecords(query: RecordsQuery): Promise<RecordsPage<ConsumptionRecordRow>> {
  const scope = await requireScope();
  const page = pageOf(query.page);
  const where = {
    EnergySource: { Asset: { ...scopeWhere(scope), ...(query.assetId ? { id: query.assetId } : {}) } },
    ...(monthRange(query.month) ? { periodStart: monthRange(query.month) } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.energyConsumption.count({ where }),
    prisma.energyConsumption.findMany({
      where,
      orderBy: [{ periodStart: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * RECORDS_PAGE_SIZE,
      take: RECORDS_PAGE_SIZE,
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        consumptionKwh: true,
        lifecycleStage: true,
        EnergySource: { select: { name: true, Asset: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize: RECORDS_PAGE_SIZE,
    rows: rows.map((r) => ({
      id: r.id,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      consumptionKwh: r.consumptionKwh,
      lifecycleStage: r.lifecycleStage,
      source: r.EnergySource.name,
      assetId: r.EnergySource.Asset.id,
      asset: r.EnergySource.Asset.name,
    })),
  };
}

export async function listEmissionRecords(query: RecordsQuery): Promise<RecordsPage<EmissionRecordRow>> {
  const scope = await requireScope();
  const page = pageOf(query.page);
  const where = {
    EnergyConsumption: {
      EnergySource: { Asset: { ...scopeWhere(scope), ...(query.assetId ? { id: query.assetId } : {}) } },
      ...(monthRange(query.month) ? { periodStart: monthRange(query.month) } : {}),
    },
  };

  const [total, rows] = await Promise.all([
    prisma.emissionRecord.count({ where }),
    prisma.emissionRecord.findMany({
      where,
      orderBy: [{ EnergyConsumption: { periodStart: 'desc' } }, { id: 'asc' }],
      skip: (page - 1) * RECORDS_PAGE_SIZE,
      take: RECORDS_PAGE_SIZE,
      select: {
        id: true,
        co2eKg: true,
        scope: true,
        verificationStatus: true,
        emissionFactor: true,
        certificationId: true,
        EnergyConsumption: {
          select: {
            periodStart: true,
            periodEnd: true,
            EnergySource: { select: { name: true, Asset: { select: { id: true, name: true } } } },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize: RECORDS_PAGE_SIZE,
    rows: rows.map((r) => ({
      id: r.id,
      periodStart: r.EnergyConsumption.periodStart.toISOString(),
      periodEnd: r.EnergyConsumption.periodEnd.toISOString(),
      co2eKg: r.co2eKg,
      scope: r.scope,
      verificationStatus: r.verificationStatus,
      emissionFactor: r.emissionFactor,
      certified: r.certificationId != null,
      source: r.EnergyConsumption.EnergySource.name,
      assetId: r.EnergyConsumption.EnergySource.Asset.id,
      asset: r.EnergyConsumption.EnergySource.Asset.name,
    })),
  };
}
