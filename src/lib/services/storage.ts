import type { Storage as GCSStorageType } from '@google-cloud/storage';
import { StorageError, InvalidFileError, BucketNotConfiguredError } from '../storage/errors';
import type { UploadType } from '../storage/types';

export type { UploadType } from '../storage/types';

export interface StorageService {
  saveImageFor(kind: UploadType, file: File): Promise<{ url: string; bytes: number; contentType: string }>;
  getSize(url: string): Promise<number>;
  getFile(url: string): Promise<{ buffer: Buffer; contentType: string }>;
}

// Helper para retry manual
async function withRetry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < times - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

// Helper para timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}

export function createStorageService(): StorageService {
  const bucket = process.env.GCS_BUCKET;

  if (!bucket) {
    return {
      async saveImageFor() {
        throw new BucketNotConfiguredError('GCS_BUCKET no está configurado');
      },
      async getSize() {
        throw new StorageError('GCS_BUCKET no está configurado');
      },
      async getFile() {
        throw new StorageError('GCS_BUCKET no está configurado');
      },
    };
  }

  const { Storage } = require('@google-cloud/storage') as {
    Storage: new () => GCSStorageType;
  };
  const storage = new Storage();
  const gcsBucket = storage.bucket(bucket);

  return {
    async saveImageFor(kind: UploadType, file: File): Promise<{ url: string; bytes: number; contentType: string }> {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        throw new InvalidFileError('invalid_type', file.type);
      }

      // Validar tipo de upload
      if (!['product', 'item', 'issue', 'fraud-report', 'org-logo'].includes(kind)) {
        throw new InvalidFileError('invalid_upload_type');
      }

      // Leer archivo
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (error) {
        throw new StorageError('Error leyendo el archivo', error);
      }

      const buffer = Buffer.from(arrayBuffer);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${Date.now()}.${ext}`;
      const objectPath = `uploads/${kind}/${fileName}`;

      // Subir a GCS con retry automático
      try {
        await withTimeout(
          withRetry(async () => {
            const blob = gcsBucket.file(objectPath);
            await blob.save(buffer, {
              contentType: file.type,
              resumable: false,
              validation: 'crc32c',
            });
          }, 3, 100),
          60000 // 60 segundos
        );
      } catch (error) {
        if (error instanceof InvalidFileError) throw error;
        throw new StorageError('Error subiendo archivo a GCS', error);
      }

      const url = `https://storage.googleapis.com/${bucket}/${objectPath}`;
      return { url, bytes: buffer.byteLength, contentType: file.type };
    },

    async getSize(url: string): Promise<number> {
      try {
        return await withTimeout(
          withRetry(async () => {
            const res = await fetch(url, { method: 'HEAD' });
            const contentLength = res.headers.get('content-length');

            if (!contentLength) {
              throw new Error('No content-length header');
            }

            return parseInt(contentLength, 10);
          }, 2),
          10000 // 10 segundos
        );
      } catch (error) {
        throw new StorageError(`Error obteniendo tamaño: ${url}`, error);
      }
    },

    async getFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
      try {
        return await withTimeout(
          withRetry(async () => {
            const res = await fetch(url);

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType =
              res.headers.get('content-type') || 'application/octet-stream';

            return { buffer, contentType };
          }, 2),
          30000 // 30 segundos
        );
      } catch (error) {
        throw new StorageError(`Error descargando: ${url}`, error);
      }
    },
  };
}

export const storageService = createStorageService();
