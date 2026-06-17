'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function listEventsByType(eventType: string, limit?: number) {
  try {
    const organizationId = await requireOrganizationId();
    const events = await eventRepository.findByType(organizationId, eventType, limit);
    return { success: true, data: events };
  } catch (error) {
    console.error('Error listing events by type:', error);
    return { success: false, error: 'Error al listar eventos', data: [] };
  }
}


