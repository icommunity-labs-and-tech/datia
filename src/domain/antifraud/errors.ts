export class ItemNotFoundError extends Error {
  readonly _tag = 'ItemNotFoundError';
  constructor(public readonly itemId: string, message: string) {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class NoCreatorSignatureError extends Error {
  readonly _tag = 'NoCreatorSignatureError';
  constructor(public readonly itemId: string, message: string) {
    super(message);
    this.name = 'NoCreatorSignatureError';
  }
}

export class EvidenceCreationError extends Error {
  readonly _tag = 'EvidenceCreationError';
  constructor(public readonly itemId: string, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EvidenceCreationError';
  }
}

