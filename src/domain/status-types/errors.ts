export class StatusTypeInputError extends Error {
  readonly _tag = 'StatusTypeInputError';
  constructor(public readonly field: 'name' | 'description' | 'organizationId' | 'template' | 'id', message: string) {
    super(message);
    this.name = 'StatusTypeInputError';
  }
}

export class StatusTypeAlreadyExistsError extends Error {
  readonly _tag = 'StatusTypeAlreadyExistsError';
  constructor(public readonly name: string, public readonly organizationId: string, message: string) {
    super(message);
    this.name = 'StatusTypeAlreadyExistsError';
  }
}

export class StatusTypeNotFoundError extends Error {
  readonly _tag = 'StatusTypeNotFoundError';
  constructor(public readonly statusTypeId: string, message: string) {
    super(message);
    this.name = 'StatusTypeNotFoundError';
  }
}

export class StatusTypeHasDependenciesError extends Error {
  readonly _tag = 'StatusTypeHasDependenciesError';
  constructor(public readonly statusTypeId: string, message: string) {
    super(message);
    this.name = 'StatusTypeHasDependenciesError';
  }
}

export class CategoryNotFoundError extends Error {
  readonly _tag = 'CategoryNotFoundError';
  constructor(public readonly categoryId: string, message: string) {
    super(message);
    this.name = 'CategoryNotFoundError';
  }
}
