import { prisma } from '@/lib/prisma';
import type { FraudReportRepository } from '@/domain/fraudReports/FraudReportRepository';
import type {
  CreateFraudReportInput,
  FraudReport,
  FraudReportStatus,
  FraudReportWithItem,
  UpdateFraudReportInput,
} from '@/domain/fraudReports/FraudReport';
import { FraudReportCreationError, FraudReportNotFoundError } from '@/domain/fraudReports/errors';

const itemSelect = {
  id: true,
  name: true,
  imageUrl: true,
};

function toFraudReport(row: any): FraudReport {
  return {
    id: row.id,
    itemId: row.itemId,
    organizationId: row.organizationId,
    acquiredAt: row.acquiredAt,
    latitude: row.latitude,
    longitude: row.longitude,
    locationName: row.locationName,
    comments: row.comments,
    imageUrls: row.imageUrls ?? [],
    status: row.status as FraudReportStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toFraudReportWithItem(row: any): FraudReportWithItem {
  return {
    ...toFraudReport(row),
    item: {
      id: row.Item.id,
      name: row.Item.name,
      imageUrl: row.Item.imageUrl,
    },
  };
}

export const fraudReportRepository: FraudReportRepository = {
  async create(input: CreateFraudReportInput): Promise<FraudReport> {
    try {
      const row = await prisma.fraudReport.create({
        data: {
          itemId: input.itemId,
          organizationId: input.organizationId,
          acquiredAt: input.acquiredAt ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          locationName: input.locationName ?? null,
          comments: input.comments ?? null,
          imageUrls: input.imageUrls ?? [],
        },
      });
      return toFraudReport(row);
    } catch (e) {
      throw new FraudReportCreationError(e);
    }
  },

  async findById(id: string, organizationId: string): Promise<FraudReportWithItem | null> {
    const row = await prisma.fraudReport.findFirst({
      where: { id, organizationId },
      include: { Item: { select: itemSelect } },
    });
    if (!row) return null;
    return toFraudReportWithItem(row);
  },

  async findByOrganization(
    organizationId: string,
    filters?: { status?: FraudReportStatus; itemId?: string },
  ): Promise<FraudReportWithItem[]> {
    const rows = await prisma.fraudReport.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.itemId ? { itemId: filters.itemId } : {}),
      },
      include: { Item: { select: itemSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toFraudReportWithItem);
  },

  async findByItem(itemId: string, organizationId: string): Promise<FraudReport[]> {
    const rows = await prisma.fraudReport.findMany({
      where: { itemId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toFraudReport);
  },

  async update(id: string, organizationId: string, input: UpdateFraudReportInput): Promise<FraudReport> {
    const existing = await prisma.fraudReport.findFirst({ where: { id, organizationId } });
    if (!existing) throw new FraudReportNotFoundError(id);
    const row = await prisma.fraudReport.update({
      where: { id },
      data: { ...(input.status ? { status: input.status } : {}) },
    });
    return toFraudReport(row);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    const existing = await prisma.fraudReport.findFirst({ where: { id, organizationId } });
    if (!existing) throw new FraudReportNotFoundError(id);
    await prisma.fraudReport.delete({ where: { id } });
  },

  async countPending(organizationId: string): Promise<number> {
    return prisma.fraudReport.count({ where: { organizationId, status: 'PENDING' } });
  },
};
