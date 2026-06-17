import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { prisma } from '@/lib/prisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { randomUUID } from 'crypto';

const schema = z.object({
  itemId: z.string(),
  statusTypeId: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await validateApiToken(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { itemId, statusTypeId, title, description, metadata } = parsed.data;

  // Verify the item belongs to the authenticated org
  const item = await prisma.item.findFirst({ where: { id: itemId, organizationId: auth.organizationId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // Verify the status type belongs to the authenticated org
  const statusType = await prisma.statusType.findFirst({ where: { id: statusTypeId, organizationId: auth.organizationId } });
  if (!statusType) return NextResponse.json({ error: 'StatusType not found' }, { status: 404 });

  const state = await prisma.state.create({
    data: {
      id: randomUUID(),
      itemId,
      statusTypeId,
      title,
      description,
      evidenceID: randomUUID(), // placeholder — not blockchain-backed
      backed: false,
      templateConfig: metadata ? (metadata as object) : undefined,
    },
  });

  await eventRepository.create(auth.organizationId, {
    eventType: 'maintenance_event',
    entityType: 'State',
    entityId: state.id,
    data: { stateId: state.id, itemId, statusTypeId, title },
  });

  return NextResponse.json({ data: state }, { status: 201 });
}
