import type { UploadType } from '@/lib/storage/types';
import { UploadInputError } from './uploadImage.errors';

export interface UploadRequest {
  file: File;
  type: UploadType;
}

export function parseAndValidateFormData(formData: FormData): UploadRequest {
  const file = formData.get('image') as File | null;
  if (!file) {
    throw new UploadInputError('image', 'No se proporcionó ningún archivo');
  }

  const type = formData.get('type') as string | null;
  if (!type || !['product', 'item', 'issue'].includes(type)) {
    throw new UploadInputError('type', 'Tipo de upload inválido');
  }

  return { file, type: type as UploadType };
}


