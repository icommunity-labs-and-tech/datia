/**
 * Webhook service errors
 */

export class WebhookConfigError extends Error {
  readonly _tag = 'WebhookConfigError';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookConfigError';
  }
}

export class WebhookSignatureInvalid extends Error {
  readonly _tag = 'WebhookSignatureInvalid';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureInvalid';
  }
}

export class WebhookTimestampSkew extends Error {
  readonly _tag = 'WebhookTimestampSkew';
  constructor(message: string, public readonly skewMs: number) {
    super(message);
    this.name = 'WebhookTimestampSkew';
  }
}

export class WebhookParseError extends Error {
  readonly _tag = 'WebhookParseError';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookParseError';
  }
}

export class WebhookIdempotencyError extends Error {
  readonly _tag = 'WebhookIdempotencyError';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookIdempotencyError';
  }
}
