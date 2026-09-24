'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function toggleWebhookActive(id: string, active: boolean) {
  try {
    const scope = await requireScope();
    const webhook = await webhookRepository.update(id, scope, { active });
    return { success: true, data: webhook };
  } catch (error) {
    console.error('Error toggling webhook active:', error);
    return { success: false, error: 'Error al actualizar estado del webhook' };
  }
}


