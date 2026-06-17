/**
 * Storage service errors
 */

export class StorageError extends Error {
  readonly _tag = 'StorageError';
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

export class InvalidFileError extends Error {
  readonly _tag = 'InvalidFileError';
  constructor(public readonly reason: 'invalid_type' | 'invalid_upload_type', public readonly receivedType?: string) {
    super(`Invalid file: ${reason}${receivedType ? ` (${receivedType})` : ''}`);
    this.name = 'InvalidFileError';
  }
}

export class BucketNotConfiguredError extends Error {
  readonly _tag = 'BucketNotConfiguredError';
  constructor(message: string) {
    super(message);
    this.name = 'BucketNotConfiguredError';
  }
}
