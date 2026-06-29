import type { UploadType } from '@/lib/storage/types';
import { UploadPolicyViolation } from './uploadImage.errors';

export interface UploadLimits {
  maxImageBytes: number; // e.g. 5 * 1024 * 1024
  allowedMimePrefix: string; // e.g. 'image/'
  allowedKinds: ReadonlyArray<UploadType>;
}

export interface UploadPolicyService {
  readonly limits: UploadLimits;
  validateKind(kind: string): UploadType;
  validateFileSize(file: File): void;
  validateMime(file: File): void;
}

export function createUploadPolicyService(): UploadPolicyService {
  return {
    limits: {
      maxImageBytes: 5 * 1024 * 1024,
      allowedMimePrefix: 'image/',
      allowedKinds: ['product', 'item', 'issue', 'org-logo'] as const,
    },
    validateKind(kind: string): UploadType {
      if (!['product', 'item', 'issue', 'org-logo'].includes(kind)) {
        throw new UploadPolicyViolation('invalidKind');
      }
      return kind as UploadType;
    },
    validateFileSize(file: File): void {
      if (file.size > 5 * 1024 * 1024) {
        throw new UploadPolicyViolation('sizeLimitExceeded', file.size, 5 * 1024 * 1024);
      }
    },
    validateMime(file: File): void {
      if (!file.type?.startsWith('image/')) {
        throw new UploadPolicyViolation('mimeTypeNotAllowed', undefined, undefined, file.type || 'unknown');
      }
    },
  };
}

export const defaultUploadPolicyService = createUploadPolicyService();


