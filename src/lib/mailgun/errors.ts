/**
 * Mailgun service errors
 */

export class MailgunConfigError extends Error {
  readonly _tag = 'MailgunConfigError';
  constructor(message: string) {
    super(message);
    this.name = 'MailgunConfigError';
  }
}

export class MailgunHTTPError extends Error {
  readonly _tag = 'MailgunHTTPError';
  constructor(
    public readonly operation: string,
    message: string,
    public readonly status?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'MailgunHTTPError';
  }
}
