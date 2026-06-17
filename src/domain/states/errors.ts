export class StateInputError extends Error {
  readonly _tag = 'StateInputError';
  constructor(public readonly field: 'name' | 'description' | 'statusTypeId' | 'itemId', message: string) {
    super(message);
    this.name = 'StateInputError';
  }
}

export class StateAlreadyExistsError extends Error {
  readonly _tag = 'StateAlreadyExistsError';
  constructor(public readonly stateId: string, message: string) {
    super(message);
    this.name = 'StateAlreadyExistsError';
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

export class StateCreationRollbackError extends Error {
  readonly _tag = 'StateCreationRollbackError';
  constructor(public readonly stateId: string, public readonly reason: 'evidence_failed' | 'db_error', message: string) {
    super(message);
    this.name = 'StateCreationRollbackError';
  }
}
