/**
 * OpenAI service errors
 */

export class OpenAIConfigError extends Error {
  readonly _tag = 'OpenAIConfigError';
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIConfigError';
  }
}

export class OpenAIHTTPError extends Error {
  readonly _tag = 'OpenAIHTTPError';
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'OpenAIHTTPError';
  }
}

export class OpenAIResponseParseError extends Error {
  readonly _tag = 'OpenAIResponseParseError';
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'OpenAIResponseParseError';
  }
}

export class OpenAIRateLimitError extends Error {
  readonly _tag = 'OpenAIRateLimitError';
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIRateLimitError';
  }
}
