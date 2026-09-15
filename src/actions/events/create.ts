'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { recordEvent } from '@/lib/services/events';

export async function createEvent(data: {
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
}) {
  try {
    const organizationId = await requireOrganizationId();
    const event = await recordEvent(organizationId, data);
    return { success: true, data: event };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error: 'Error al crear evento' };
  }
}
