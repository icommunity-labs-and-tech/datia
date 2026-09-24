'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function listEventsByType(eventType: string, limit?: number) {
  try {
    const scope = await requireScope();
    const events = await eventRepository.findByType(scope, eventType, limit);
    return { success: true, data: events };
  } catch (error) {
    console.error('Error listing events by type:', error);
    return { success: false, error: 'Error al listar eventos', data: [] };
  }
}


