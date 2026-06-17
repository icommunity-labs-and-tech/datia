export class UserInputError extends Error {
  readonly _tag = 'UserInputError';
  constructor(public readonly field: 'email' | 'name' | 'role' | 'password' | 'currentPassword' | 'newPassword' | 'confirmPassword', message: string) {
    super(message);
    this.name = 'UserInputError';
  }
}

export class UserAlreadyExistsError extends Error {
  readonly _tag = 'UserAlreadyExistsError';
  constructor(public readonly email: string, message: string) {
    super(message);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserNotFoundError extends Error {
  readonly _tag = 'UserNotFoundError';
  constructor(public readonly userId: string, message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidCredentialsError extends Error {
  readonly _tag = 'InvalidCredentialsError';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AuthorizationError extends Error {
  readonly _tag = 'AuthorizationError';
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class PasswordValidationError extends Error {
  readonly _tag = 'PasswordValidationError';
  constructor(message: string) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

export class KycUrlGenerationError extends Error {
  readonly _tag = 'KycUrlGenerationError';
  constructor(public readonly userId: string, message: string) {
    super(message);
    this.name = 'KycUrlGenerationError';
  }
}

export class SignatureCreationError extends Error {
  readonly _tag = 'SignatureCreationError';
  constructor(public readonly userId: string, message: string) {
    super(message);
    this.name = 'SignatureCreationError';
  }
}
