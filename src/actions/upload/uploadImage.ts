'use server';

import { getStorage, isUploadType } from '@/lib/storage';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function uploadImage(formData: FormData): Promise<{ imageUrl: string }> {
  try {
    // Solo desde el dashboard: sin sesión, cualquiera podría subir al bucket público.
    await requireOrganizationId();

    const file = formData.get('image') as File;
    const type = formData.get('type') as string;

    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    if (!isUploadType(type)) {
      throw new Error('Tipo de upload inválido');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo debe ser menor a 5MB');
    }

    const storage = getStorage();
    const saved = await storage.saveImage(file, type);
    return { imageUrl: saved.url };
  } catch (error) {
    console.error('Error al subir imagen:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    throw new Error(errorMessage);
  }
}

