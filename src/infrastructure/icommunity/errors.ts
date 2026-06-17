export class ICommunityConfigError extends Error {
  readonly _tag = 'ICommunityConfigError';
  constructor(message: string) {
    super(message);
    this.name = 'ICommunityConfigError';
  }
}

export class ICommunityHTTPError extends Error {
  readonly _tag = 'ICommunityHTTPError';
  constructor(public readonly operation: 'createEvidence' | 'createSignature' | 'retrySignature' | 'getEvidence', message: string, public readonly status?: number, public readonly response?: unknown) {
    super(message);
    this.name = 'ICommunityHTTPError';
  }
}
