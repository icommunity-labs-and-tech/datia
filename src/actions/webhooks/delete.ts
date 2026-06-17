'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function deleteWebhook(id: string) {
  try {
    const organizationId = await requireOrganizationId();
    await webhookRepository.delete(id, organizationId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return { success: false, error: 'Error al eliminar webhook' };
  }
}


