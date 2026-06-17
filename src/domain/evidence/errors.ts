export class EvidenceInputError extends Error {
  readonly _tag = 'EvidenceInputError';
  constructor(public readonly field: 'signatureID' | 'title' | 'metadata', message: string) {
    super(message);
    this.name = 'EvidenceInputError';
  }
}

export class ImageFetchError extends Error {
  readonly _tag = 'ImageFetchError';
  constructor(public readonly url: string, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ImageFetchError';
  }
}

export class ImageSizeExceededError extends Error {
  readonly _tag = 'ImageSizeExceededError';
  constructor(public readonly totalBytes: number, public readonly maxBytes: number, message: string) {
    super(message);
    this.name = 'ImageSizeExceededError';
  }
}

export class EvidenceBuildError extends Error {
  readonly _tag = 'EvidenceBuildError';
  constructor(public readonly step: 'imageProcessing' | 'jsonGeneration' | 'fileAssembly', message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EvidenceBuildError';
  }
}
