/**
 * Evidence service errors
 */

export class EvidenceInputError extends Error {
  readonly _tag = 'EvidenceInputError';
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = 'EvidenceInputError';
  }
}

export class ImageFetchError extends Error {
  readonly _tag = 'ImageFetchError';
  constructor(
    public readonly url: string,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ImageFetchError';
  }
}

export class ImageSizeExceededError extends Error {
  readonly _tag = 'ImageSizeExceededError';
  constructor(
    public readonly actualSize: number,
    public readonly maxSize: number,
    message: string
  ) {
    super(message);
    this.name = 'ImageSizeExceededError';
  }
}

export class EvidenceBuildError extends Error {
  readonly _tag = 'EvidenceBuildError';
  constructor(
    public readonly step: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EvidenceBuildError';
  }
}
