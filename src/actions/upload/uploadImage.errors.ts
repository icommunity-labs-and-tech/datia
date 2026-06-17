export class UploadInputError extends Error {
  readonly _tag = 'UploadInputError';
  constructor(
    public readonly field: 'image' | 'type',
    message: string
  ) {
    super(message);
    this.name = 'UploadInputError';
  }
}

export class UploadPolicyViolation extends Error {
  readonly _tag = 'UploadPolicyViolation';
  constructor(
    public readonly reason: 'sizeLimitExceeded' | 'mimeTypeNotAllowed' | 'invalidKind',
    public readonly size?: number,
    public readonly maxSize?: number,
    public readonly mimeType?: string,
    public readonly details?: string
  ) {
    super(`Upload policy violation: ${reason}`);
    this.name = 'UploadPolicyViolation';
  }
}


