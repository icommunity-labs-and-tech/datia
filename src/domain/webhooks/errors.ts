export class WebhookNotFoundError extends Error {
  readonly _tag = 'WebhookNotFoundError';
  constructor(public readonly id: string) {
    super(`Webhook not found: ${id}`);
    this.name = 'WebhookNotFoundError';
  }
}

export class WebhookValidationError extends Error {
  readonly _tag = 'WebhookValidationError';
  constructor(message: string) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

export class WebhookUrlInvalidError extends Error {
  readonly _tag = 'WebhookUrlInvalidError';
  constructor(public readonly url: string) {
    super(`Invalid webhook URL: ${url}`);
    this.name = 'WebhookUrlInvalidError';
  }
}


