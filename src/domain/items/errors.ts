export class ItemInputError extends Error {
  readonly _tag = 'ItemInputError';
  constructor(public readonly field: 'name' | 'categoryId' | 'customId' | 'description', message: string) {
    super(message);
    this.name = 'ItemInputError';
  }
}

export class ItemAlreadyExistsError extends Error {
  readonly _tag = 'ItemAlreadyExistsError';
  constructor(public readonly itemId: string, message: string) {
    super(message);
    this.name = 'ItemAlreadyExistsError';
  }
}

export class UserNotVerifiedError extends Error {
  readonly _tag = 'UserNotVerifiedError';
  constructor(public readonly userId: string, public readonly reason: 'no_signature' | 'not_verified', message: string) {
    super(message);
    this.name = 'UserNotVerifiedError';
  }
}

export class OrganizationNotVerifiedError extends Error {
  readonly _tag = 'OrganizationNotVerifiedError';
  constructor(public readonly organizationId: string, public readonly reason: 'no_signature' | 'not_verified', message: string) {
    super(message);
    this.name = 'OrganizationNotVerifiedError';
  }
}

export class ItemCreationRollbackError extends Error {
  readonly _tag = 'ItemCreationRollbackError';
  constructor(public readonly itemId: string, public readonly reason: 'evidence_failed' | 'db_error', message: string) {
    super(message);
    this.name = 'ItemCreationRollbackError';
  }
}
