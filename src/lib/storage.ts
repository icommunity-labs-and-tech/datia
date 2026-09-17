import type { Storage as GCSStorageType } from '@google-cloud/storage';

const UPLOAD_TYPES = ['product', 'item', 'issue', 'org-logo'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

export function isUploadType(value: unknown): value is UploadType {
  return UPLOAD_TYPES.some((type) => type === value);
}

export interface StorageProvider {
  saveImage(file: File, type: UploadType): Promise<{ url: string; bytes: number; contentType: string }>;
  getSize(url: string): Promise<number | null>;
  getFile(url: string): Promise<{ buffer: Buffer; contentType: string } | null>;
}


/**
 * Google Cloud Storage provider for Cloud Run (read-only FS except /tmp).
 * Requires the environment variable GCS_BUCKET to be set. Uses default
 * credentials provided by Cloud Run to authenticate.
 */
export class GCSStorageProvider implements StorageProvider {
  private bucketName: string;
  private storage: GCSStorageType;

  constructor(bucketName: string) {
    // Lazy import to avoid bundling in environments that don't need it
    // and to keep local dev lightweight.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require('@google-cloud/storage') as { Storage: new () => GCSStorageType };
    this.storage = new Storage();
    this.bucketName = bucketName;
  }

  async saveImage(file: File, type: UploadType) {
    if (!['product', 'item', 'issue', 'org-logo'].includes(type)) throw new Error('Invalid upload type');
    if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}.${ext}`;
    const objectPath = `uploads/${type}/${fileName}`;

    const bucket = this.storage.bucket(this.bucketName);
    const blob = bucket.file(objectPath);
    // Nota: con Uniform Bucket-Level Access habilitado no se permite
    // establecer ACL por objeto (public: true). La visibilidad pública
    // debe configurarse a nivel de bucket vía IAM (allUsers ->
    // roles/storage.objectViewer) o usando URLs firmadas.
    await blob.save(buffer, {
      contentType: file.type,
      resumable: false,
      validation: 'crc32c',
    });

    // Public URL (bucket should allow public read on objects)
    const url = `https://storage.googleapis.com/${this.bucketName}/${objectPath}`;
    return { url, bytes: buffer.byteLength, contentType: file.type };
  }

  async getSize(url: string) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const cl = res.headers.get('content-length');
      return cl ? parseInt(cl, 10) : null;
    } catch {
      return null;
    }
  }

  async getFile(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return { buffer: Buffer.from(ab), contentType: res.headers.get('content-type') || 'application/octet-stream' };
    } catch {
      return null;
    }
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) {
    throw new Error('GCS_BUCKET no está configurado. El almacenamiento de imágenes requiere Google Cloud Storage.');
  }
  
  provider = new GCSStorageProvider(bucket);
  return provider;
}


