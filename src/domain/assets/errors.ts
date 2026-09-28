export class AssetInputError extends Error {
  readonly _tag = 'AssetInputError';
  constructor(public readonly field: 'name' | 'categoryId' | 'customId' | 'description', message: string) {
    super(message);
    this.name = 'AssetInputError';
  }
}

export class AssetAlreadyExistsError extends Error {
  readonly _tag = 'AssetAlreadyExistsError';
  constructor(public readonly assetId: string, message: string) {
    super(message);
    this.name = 'AssetAlreadyExistsError';
  }
}

export class UserNotVerifiedError extends Error {
  readonly _tag = 'UserNotVerifiedError';
  constructor(public readonly userId: string, public readonly reason: 'no_signature' | 'not_verified', message: string) {
    super(message);
    this.name = 'UserNotVerifiedError';
  }
}

export class CompanyNotVerifiedError extends Error {
  readonly _tag = 'CompanyNotVerifiedError';
  constructor(public readonly companyId: string, public readonly reason: 'no_signature' | 'not_verified', message: string) {
    super(message);
    this.name = 'CompanyNotVerifiedError';
  }
}

export class AssetCreationRollbackError extends Error {
  readonly _tag = 'AssetCreationRollbackError';
  constructor(public readonly assetId: string, public readonly reason: 'evidence_failed' | 'db_error', message: string) {
    super(message);
    this.name = 'AssetCreationRollbackError';
  }
}
