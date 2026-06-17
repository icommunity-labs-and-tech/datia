'use server';

import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { triggerWebhooksForEvent } from '@/lib/services/events';

export async function createEvent(data: {
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
}) {
  try {
    const organizationId = await requireOrganizationId();
    const event = await eventRepository.create(organizationId, data);
    
    // Trigger webhooks asynchronously (fire and forget)
    triggerWebhooksForEvent(data.eventType, data.data, organizationId);
    
    return { success: true, data: event };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error: 'Error al crear evento' };
  }
}

