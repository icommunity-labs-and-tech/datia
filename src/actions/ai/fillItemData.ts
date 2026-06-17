'use server';

import { openAIService } from '@/lib/services/openai';

export async function fillItemData({ itemName, itemDescription, fields }: {
  itemName: string;
  itemDescription?: string | null;
  fields: Array<{ name: string; label: string; type: string }>;
}): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; }> {
  try {
    if (!itemName) {
      return { success: false, error: 'El nombre del item es requerido' };
    }
    if (!fields || !Array.isArray(fields)) {
      return { success: false, error: 'Los campos son requeridos' };
    }

    const data = await openAIService.fillItemFields({ itemName, itemDescription, fields });

    const valid: Record<string, unknown> = {};
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(data, f.name)) {
        valid[f.name] = (data as any)[f.name];
      }
    }
    return { success: true, data: valid };
  } catch {
    // Fallback error mapping
    return { success: false, error: 'Error al procesar la solicitud con IA' };
  }
}


