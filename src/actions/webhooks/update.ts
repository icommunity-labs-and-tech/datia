'use server';

import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    url?: string;
    secret?: string | null;
    events?: string[];
    active?: boolean;
    headers?: Record<string, string> | null;
  }
) {
  // Validaciones
  if (data.name !== undefined && !data.name.trim()) {
    return { success: false, error: 'El nombre no puede estar vacío' };
  }

  if (data.url !== undefined && !validateUrl(data.url)) {
    return { success: false, error: 'La URL no es válida' };
  }

  if (data.events !== undefined && data.events.length === 0) {
    return { success: false, error: 'Debes seleccionar al menos un evento' };
  }

  try {
    const organizationId = await requireOrganizationId();
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.url !== undefined) updateData.url = data.url.trim();
    if (data.secret !== undefined) updateData.secret = data.secret?.trim() || null;
    if (data.events !== undefined) updateData.events = data.events;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.headers !== undefined) updateData.headers = data.headers;
    
    const webhook = await webhookRepository.update(id, organizationId, updateData);
    return { success: true, data: webhook };
  } catch (error) {
    console.error('Error updating webhook:', error);
    return { success: false, error: 'Error al actualizar webhook' };
  }
}


