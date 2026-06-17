'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function getEvent(id: string) {
  const organizationId = await requireOrganizationId();
  const event = await eventRepository.getById(organizationId, id);
  return event;
}

