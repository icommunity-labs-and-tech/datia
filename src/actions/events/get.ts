'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function getEvent(id: string) {
  const scope = await requireScope();
  const event = await eventRepository.getById(scope, id);
  return event;
}

