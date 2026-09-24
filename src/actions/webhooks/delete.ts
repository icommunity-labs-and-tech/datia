'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function deleteWebhook(id: string) {
  try {
    const scope = await requireScope();
    await webhookRepository.delete(id, scope);
    return { success: true };
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return { success: false, error: 'Error al eliminar webhook' };
  }
}


