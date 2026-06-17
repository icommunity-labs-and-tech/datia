/**
 * Import job service errors
 */

export class ImportJobError extends Error {
  readonly _tag = 'ImportJobError';
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ImportJobError';
  }
}

export class ImportJobNotFoundError extends Error {
  readonly _tag = 'ImportJobNotFoundError';
  constructor(message: string, public readonly importId: string) {
    super(message);
    this.name = 'ImportJobNotFoundError';
  }
}

export class InvalidCsvError extends Error {
  readonly _tag = 'InvalidCsvError';
  constructor(message: string, public readonly details?: string[]) {
    super(message);
    this.name = 'InvalidCsvError';
  }
}

export class ImportJobInvalidStatusError extends Error {
  readonly _tag = 'ImportJobInvalidStatusError';
  constructor(message: string, public readonly currentStatus: string, public readonly expectedStatus?: string[]) {
    super(message);
    this.name = 'ImportJobInvalidStatusError';
  }
}
