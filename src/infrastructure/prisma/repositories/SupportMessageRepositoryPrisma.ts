import type { SupportMessageRepository } from '@/domain/support-messages/SupportMessageRepository';
import type { SupportMessageRecord, SupportMessageListItem, CreateSupportMessageInput, SupportMessageStatus } from '@/domain/support-messages/types';
import { SupportMessageNotFoundError } from '@/domain/support-messages/errors';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const toDomain = (row: any): SupportMessageRecord => ({
  id: row.id,
  subject: row.subject,
  message: row.message,
  page: row.page,
  status: row.status as SupportMessageStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  userId: row.userId,
  userName: row.userName,
  organizationId: row.organizationId,
});

export const supportMessageRepository: SupportMessageRepository = {
  async create(input: CreateSupportMessageInput): Promise<SupportMessageRecord> {
    const row = await prisma.supportMessage.create({
      data: {
        id: crypto.randomUUID(),
        subject: input.subject,
        message: input.message,
        page: input.page,
        userId: input.userId,
        userName: input.userName,
        organizationId: input.organizationId,
      },
    });
    return toDomain(row);
  },

  async findAll(): Promise<SupportMessageListItem[]> {
    const rows = await prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: { Organization: { select: { nombre: true } } },
    });
    return rows.map((row) => ({
      ...toDomain(row),
      organizationName: (row as any).Organization?.nombre ?? null,
    }));
  },

  async findByOrganization(organizationId: string): Promise<SupportMessageRecord[]> {
    const rows = await prisma.supportMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  },

  async updateStatus(id: string, status: SupportMessageStatus): Promise<SupportMessageRecord> {
    const existing = await prisma.supportMessage.findUnique({ where: { id } });
    if (!existing) throw new SupportMessageNotFoundError(id);

    const row = await prisma.supportMessage.update({
      where: { id },
      data: { status },
    });
    return toDomain(row);
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.supportMessage.findUnique({ where: { id } });
    if (!existing) throw new SupportMessageNotFoundError(id);

    await prisma.supportMessage.delete({ where: { id } });
  },
};
