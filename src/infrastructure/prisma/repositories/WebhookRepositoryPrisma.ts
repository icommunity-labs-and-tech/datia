import { WebhookRepository, type WebhookRecord, type CreateWebhookInput, type UpdateWebhookInput, DbError } from '@/domain/webhooks/WebhookRepository';
import { prisma } from '@/lib/prisma';
import { defaultCompanyId } from '@/lib/company';
import { randomUUID } from 'crypto';

const toDomain = (w: any): WebhookRecord => ({
  id: w.id,
  organizationId: w.organizationId,
  name: w.name,
  url: w.url,
  secret: w.secret ?? null,
  events: w.events ?? [],
  active: w.active ?? true,
  headers: w.headers ?? null,
  lastTriggeredAt: w.lastTriggeredAt ?? null,
  lastSuccessAt: w.lastSuccessAt ?? null,
  lastFailureAt: w.lastFailureAt ?? null,
  failureCount: w.failureCount ?? 0,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});

export const webhookRepository: WebhookRepository = {
  async list(organizationId: string): Promise<WebhookRecord[]> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const webhooks = await prisma.webhook.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });
      return webhooks.map(toDomain);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error al listar webhooks');
    }
  },

  async getById(id: string, organizationId: string): Promise<WebhookRecord | null> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const webhook = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });
      return webhook ? toDomain(webhook) : null;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(organizationId: string, input: CreateWebhookInput): Promise<WebhookRecord> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const webhook = await prisma.webhook.create({
        data: {
          id: randomUUID(),
          updatedAt: new Date(),
          organizationId,
          companyId: await defaultCompanyId(organizationId),
          name: input.name,
          url: input.url,
          secret: input.secret ?? null,
          events: input.events ?? [],
          active: input.active ?? true,
          headers: input.headers ?? undefined,
        },
      });
      return toDomain(webhook);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async update(id: string, organizationId: string, input: UpdateWebhookInput): Promise<WebhookRecord> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const existing = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });
      if (!existing) {
        throw new DbError({ message: 'Webhook no encontrado' });
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.url !== undefined) updateData.url = input.url;
      if (input.secret !== undefined) updateData.secret = input.secret;
      if (input.events !== undefined) updateData.events = input.events;
      if (input.active !== undefined) updateData.active = input.active;
      if (input.headers !== undefined) updateData.headers = input.headers;

      const webhook = await prisma.webhook.update({
        where: { id },
        data: updateData,
      });
      return toDomain(webhook);
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const existing = await prisma.webhook.findFirst({
        where: { id, organizationId },
      });
      if (!existing) {
        throw new DbError({ message: 'Webhook no encontrado' });
      }

      await prisma.webhook.delete({
        where: { id },
      });
    } catch (e) {
      if (e instanceof DbError) throw e;
      throw new DbError(e);
    }
  },

  async updateTriggered(id: string, success: boolean): Promise<void> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      await prisma.webhook.update({
        where: { id },
        data: {
          lastTriggeredAt: new Date(),
          ...(success
            ? {
                lastSuccessAt: new Date(),
                failureCount: 0,
              }
            : {
                lastFailureAt: new Date(),
                failureCount: { increment: 1 },
              }),
        },
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByOrganizationAndActive(organizationId: string, active: boolean): Promise<WebhookRecord[]> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const webhooks = await prisma.webhook.findMany({
        where: { organizationId, active },
        orderBy: { createdAt: 'desc' },
      });
      return webhooks.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByEvent(organizationId: string, eventType: string): Promise<WebhookRecord[]> {
    try {
      if (!prisma.webhook) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo webhook. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo webhook. Por favor, reinicia el servidor de desarrollo.'
        );
      }
      const webhooks = await prisma.webhook.findMany({
        where: {
          organizationId,
          active: true,
          events: { has: eventType },
        },
        orderBy: { createdAt: 'desc' },
      });
      return webhooks.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
