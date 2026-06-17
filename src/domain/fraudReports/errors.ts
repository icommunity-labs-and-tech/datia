export class FraudReportItemNotFoundError extends Error {
  readonly _tag = 'FraudReportItemNotFoundError';
  constructor(itemId: string) {
    super(`Item not found: ${itemId}`);
  }
}

export class FraudReportCreationError extends Error {
  readonly _tag = 'FraudReportCreationError';
  constructor(cause?: unknown) {
    super(`Failed to create fraud report${cause ? `: ${cause}` : ''}`);
  }
}

export class FraudReportNotFoundError extends Error {
  readonly _tag = 'FraudReportNotFoundError';
  constructor(id: string) {
    super(`Fraud report not found: ${id}`);
  }
}
