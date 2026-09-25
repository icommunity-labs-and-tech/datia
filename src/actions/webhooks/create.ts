'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireScope } from '@/lib/auth/tenant';

function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function createWebhook(data: {
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  active?: boolean;
  headers?: Record<string, string> | null;
}) {
  // Validaciones
  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'El nombre es requerido' };
  }

  if (!data.url || !data.url.trim()) {
    return { success: false, error: 'La URL es requerida' };
  }

  if (!validateUrl(data.url)) {
    return { success: false, error: 'La URL no es válida' };
  }

  if (!data.events || data.events.length === 0) {
    return { success: false, error: 'Debes seleccionar al menos un evento' };
  }

  try {
    const scope = await requireScope();
    const webhook = await webhookRepository.create(scope, {
      name: data.name.trim(),
      url: data.url.trim(),
      secret: data.secret?.trim() || null,
      events: data.events,
      active: data.active ?? true,
      headers: data.headers || null,
    });
    return { success: true, data: webhook };
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    if (error._tag === 'WebhookUrlInvalidError' || error._tag === 'WebhookValidationError') {
      return { success: false, error: error.message || 'Error de validación' };
    }
    return { success: false, error: 'Error al crear webhook' };
  }
}


