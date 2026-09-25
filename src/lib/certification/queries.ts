import { prisma } from '@/lib/prisma';
import type { CertificationStatus } from '@/generated/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

/**
 * Reads over the proofs of an organisation, or of one of its companies.
 *
 * An asset is certified through its energy: source → consumption → emission →
 * certification. Assets used to carry their own `State` history and the badge
 * came from its last entry; that history is gone (#63) and what is provable
 * about an asset is what has been anchored for it.
 */

/** Assets with at least one proof already on chain. */
export async function certifiedAssetIds(scope: Scope): Promise<Set<string>> {
  const rows = await prisma.asset.findMany({
    where: {
      ...scopeWhere(scope),
      EnergySource: {
        some: {
          EnergyConsumption: {
            some: { EmissionRecord: { some: { Certification: { status: 'CERTIFIED' } } } },
          },
        },
      },
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export interface AssetCertification {
  id: string;
  status: CertificationStatus;
  /** Period the proof covers, as it was certified. */
  period: string | null;
  co2eKg: number | null;
  readings: number | null;
  hash: string | null;
  network: string | null;
  checkerUrl: string | null;
  certifiedAt: Date | null;
  createdAt: Date;
}

const asText = (value: unknown) => (typeof value === 'string' ? value : null);
const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

function toAssetCertification(row: {
  id: string;
  status: CertificationStatus;
  payload: unknown;
  hash: string | null;
  network: string | null;
  checkerUrl: string | null;
  certifiedAt: Date | null;
  createdAt: Date;
}): AssetCertification {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    status: row.status,
    period: asText(payload.period),
    // A monthly proof carries the aggregate; a single one, its own figure.
    co2eKg: asNumber(payload.totalCo2eKg) ?? asNumber(payload.co2eKg),
    readings: asNumber(payload.readings),
    hash: row.hash,
    network: row.network,
    checkerUrl: row.checkerUrl,
    certifiedAt: row.certifiedAt,
    createdAt: row.createdAt,
  };
}

/** The proofs of one asset, newest first. */
export async function listAssetCertifications(
  scope: Scope,
  assetId: string,
  limit = 50
): Promise<AssetCertification[]> {
  const rows = await prisma.certification.findMany({
    where: {
      ...scopeWhere(scope),
      EmissionRecord: { some: { EnergyConsumption: { EnergySource: { assetId } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map(toAssetCertification);
}

/** The latest proofs of everything inside the scope, newest first. */
export async function listCertifications(scope: Scope, limit = 100): Promise<AssetCertification[]> {
  const rows = await prisma.certification.findMany({
    where: scopeWhere(scope),
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map(toAssetCertification);
}

export interface CertificationCounts {
  total: number;
  certified: number;
  issued: number;
  thisMonth: number;
}

export async function certificationCounts(scope: Scope): Promise<CertificationCounts> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, certified, thisMonth] = await Promise.all([
    prisma.certification.count({ where: scopeWhere(scope) }),
    prisma.certification.count({ where: { ...scopeWhere(scope), status: 'CERTIFIED' } }),
    prisma.certification.count({ where: { ...scopeWhere(scope), createdAt: { gte: startOfMonth } } }),
  ]);

  return { total, certified, issued: total - certified, thisMonth };
}
