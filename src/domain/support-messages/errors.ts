export class SupportMessageNotFoundError extends Error {
  readonly _tag = 'SupportMessageNotFoundError';
  constructor(public readonly messageId: string) {
    super(`Support message not found: ${messageId}`);
    this.name = 'SupportMessageNotFoundError';
  }
}
