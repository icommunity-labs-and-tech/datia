export class VerificationInputError extends Error {
  readonly _tag = 'VerificationInputError';
  constructor(public readonly field: 'itemId' | 'stateId', message: string) {
    super(message);
    this.name = 'VerificationInputError';
  }
}

export class ItemNotFoundError extends Error {
  readonly _tag = 'ItemNotFoundError';
  constructor(public readonly itemId: string, message: string) {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class StateNotFoundError extends Error {
  readonly _tag = 'StateNotFoundError';
  constructor(public readonly stateId: string, message: string) {
    super(message);
    this.name = 'StateNotFoundError';
  }
}

export class NoEvidenceError extends Error {
  readonly _tag = 'NoEvidenceError';
  constructor(message: string) {
    super(message);
    this.name = 'NoEvidenceError';
  }
}

export class BlockchainAPIError extends Error {
  readonly _tag = 'BlockchainAPIError';
  constructor(message: string) {
    super(message);
    this.name = 'BlockchainAPIError';
  }
}

export class VerificationTimeoutError extends Error {
  readonly _tag = 'VerificationTimeoutError';
  constructor(message: string) {
    super(message);
    this.name = 'VerificationTimeoutError';
  }
}
