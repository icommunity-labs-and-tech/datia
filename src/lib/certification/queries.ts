import { prisma } from '@/lib/prisma';
import type { CertificationStatus } from '@/generated/prisma';

/**
 * Reads over the proofs of an organisation.
 *
 * An asset is certified through its energy: source → consumption → emission →
 * certification. Assets used to carry their own `State` history and the badge
 * came from its last entry; that history is gone (#63) and what is provable
 * about an asset is what has been anchored for it.
 */

/** Assets with at least one proof already on chain. */
export async function certifiedItemIds(organizationId: string): Promise<Set<string>> {
  const rows = await prisma.item.findMany({
    where: {
      organizationId,
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

export interface ItemCertification {
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

/** The proofs of one asset, newest first. */
export async function listItemCertifications(
  organizationId: string,
  itemId: string,
  limit = 50
): Promise<ItemCertification[]> {
  const rows = await prisma.certification.findMany({
    where: {
      organizationId,
      EmissionRecord: { some: { EnergyConsumption: { EnergySource: { itemId } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((row) => {
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
  });
}

export interface CertificationCounts {
  total: number;
  certified: number;
  issued: number;
  thisMonth: number;
}

export async function certificationCounts(organizationId: string): Promise<CertificationCounts> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, certified, thisMonth] = await Promise.all([
    prisma.certification.count({ where: { organizationId } }),
    prisma.certification.count({ where: { organizationId, status: 'CERTIFIED' } }),
    prisma.certification.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
  ]);

  return { total, certified, issued: total - certified, thisMonth };
}
