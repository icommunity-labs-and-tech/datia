'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

export async function listWebhooks() {
  try {
    const scope = await requireScope();
    const webhooks = await webhookRepository.list(scope);
    return { success: true, data: webhooks };
  } catch (error: any) {
    console.error('Exception listing webhooks:', error);
    return { 
      success: false, 
      error: error?.message || String(error) || 'Error al listar webhooks',
      data: [] 
    };
  }
}

