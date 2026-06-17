'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function listEvents(limit?: number) {
  try {
    const organizationId = await requireOrganizationId();
    const events = await eventRepository.list(organizationId, limit);
    return { success: true, data: events };
  } catch (error) {
    console.error('Error listing events:', error);
    return { success: false, error: 'Error al listar eventos', data: [] };
  }
}


