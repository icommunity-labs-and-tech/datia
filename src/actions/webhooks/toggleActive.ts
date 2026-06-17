'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function toggleWebhookActive(id: string, active: boolean) {
  try {
    const organizationId = await requireOrganizationId();
    const webhook = await webhookRepository.update(id, organizationId, { active });
    return { success: true, data: webhook };
  } catch (error) {
    console.error('Error toggling webhook active:', error);
    return { success: false, error: 'Error al actualizar estado del webhook' };
  }
}


