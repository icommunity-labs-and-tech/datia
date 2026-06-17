export class CategoryInputError extends Error {
  readonly _tag = 'CategoryInputError';
  constructor(public readonly field: 'name' | 'description' | 'itemTemplate' | 'id' | 'categoryId', message: string) {
    super(message);
    this.name = 'CategoryInputError';
  }
}

export class CategoryAlreadyExistsError extends Error {
  readonly _tag = 'CategoryAlreadyExistsError';
  constructor(public readonly name: string, message: string) {
    super(message);
    this.name = 'CategoryAlreadyExistsError';
  }
}

export class CategoryNotFoundError extends Error {
  readonly _tag = 'CategoryNotFoundError';
  constructor(public readonly categoryId: string, message: string) {
    super(message);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryHasDependenciesError extends Error {
  readonly _tag = 'CategoryHasDependenciesError';
  constructor(public readonly categoryId: string, message: string) {
    super(message);
    this.name = 'CategoryHasDependenciesError';
  }
}
