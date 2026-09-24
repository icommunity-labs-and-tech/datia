'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function listEvents(limit?: number) {
  try {
    const scope = await requireScope();
    const events = await eventRepository.list(scope, limit);
    return { success: true, data: events };
  } catch (error) {
    console.error('Error listing events:', error);
    return { success: false, error: 'Error al listar eventos', data: [] };
  }
}


