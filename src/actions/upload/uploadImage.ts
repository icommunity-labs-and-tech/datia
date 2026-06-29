'use server';

import { getStorage } from '@/lib/storage';
import { UploadInputError, UploadPolicyViolation } from './uploadImage.errors';
import { parseAndValidateFormData } from './uploadImage.schema';
import { defaultUploadPolicyService } from './uploadImage.policy';
import { storageService } from '@/lib/services/storage';
import { InvalidFileError, StorageError, BucketNotConfiguredError } from '@/lib/storage/errors';

/**
 * Upload image action (migrated from Effect version)
 */
export async function uploadImageAction(
  formData: FormData
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    // 1. Parse & validate input
    const { file, type } = parseAndValidateFormData(formData);

    // 2. Validate policies (size, mime, kind)
    const policy = defaultUploadPolicyService;
    policy.validateKind(type);
    policy.validateMime(file);
    policy.validateFileSize(file);

    // 3. Upload image (with retry from storage service)
    const result = await storageService.saveImageFor(type, file);

    return { imageUrl: result.url };
  } catch (error) {
    // Map errors to user-friendly messages
    if (error instanceof UploadInputError) {
      return { error: `${error.field}: ${error.message}` };
    }
    if (error instanceof UploadPolicyViolation) {
      switch (error.reason) {
        case 'sizeLimitExceeded': {
          const size = error.size ? Math.round(error.size / 1024 / 1024) : undefined;
          const max = error.maxSize ? Math.round(error.maxSize / 1024 / 1024) : undefined;
          return { error: `Archivo demasiado grande (${size}MB). Máximo: ${max}MB` };
        }
        case 'mimeTypeNotAllowed':
          return { error: `El archivo debe ser una imagen. Tipo recibido: ${error.mimeType}` };
        case 'invalidKind':
          return { error: 'Tipo de upload inválido' };
        default:
          return { error: 'Error de política de subida' };
      }
    }
    if (error instanceof InvalidFileError) {
      return {
        error:
          error.reason === 'invalid_type'
            ? `El archivo debe ser una imagen. Tipo recibido: ${error.receivedType}`
            : 'Tipo de upload inválido',
      };
    }
    if (error instanceof StorageError) {
      return { error: `Error de almacenamiento: ${error.message}` };
    }
    if (error instanceof BucketNotConfiguredError) {
      return { error: 'Almacenamiento no configurado' };
    }

    // Unknown error
    console.error('Unknown upload error:', error);
    return { error: 'Error desconocido al subir imagen' };
  }
}

export async function uploadImage(formData: FormData): Promise<{ imageUrl: string }> {
  try {
    const file = formData.get('image') as File;
    const type = formData.get('type') as string;

    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    if (!type || !['product', 'item', 'issue', 'org-logo'].includes(type)) {
      throw new Error('Tipo de upload inválido');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo debe ser menor a 5MB');
    }

    const storage = getStorage();
    const saved = await storage.saveImage(file, type as any);
    return { imageUrl: saved.url };
  } catch (error) {
    console.error('Error al subir imagen:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    throw new Error(errorMessage);
  }
}

