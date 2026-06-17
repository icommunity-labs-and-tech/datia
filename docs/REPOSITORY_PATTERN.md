# Repository Pattern Implementation

This document describes the implementation of the Repository Pattern using Effect.ts for clean separation between domain logic and database access.

## Overview

The Repository Pattern abstracts database access behind interfaces, allowing:
- **Clean domain logic** without database concerns
- **Easy testing** with mocked repositories
- **Flexible data sources** (can swap Prisma for other ORMs)
- **Type-safe operations** with Effect.ts

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Domain Layer  │    │ Infrastructure   │    │   Actions       │
│                 │    │     Layer        │    │     Layer       │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Repository      │◄───┤ Repository       │    │ Server Actions  │
│ Interface       │    │ Implementation   │    │                 │
│ (Effect.ts Tag) │    │ (PrismaLive)     │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Domain Service  │    │ PrismaClient     │    │ Error Mapping   │
│ (Business Logic)│    │ Service          │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Domain Errors   │    │ Database Mappers │    │ Dependency      │
│ (Typed Errors)  │    │ (toDomain)       │    │ Injection       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Implementation Details

### 1. Repository Interface (Domain)

Each repository is defined as an Effect.ts Context.Tag:

```typescript
// src/domain/users/UserRepository.ts
import { Context, Effect } from 'effect';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  passwordHash?: string;
}

export class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly getById: (id: string) => Effect.Effect<UserRecord, UserNotFoundError | DbError>;
    readonly getByEmail: (email: string) => Effect.Effect<UserRecord, UserNotFoundError | DbError>;
    readonly create: (input: CreateUserInput) => Effect.Effect<UserRecord, UserInputError | UserAlreadyExistsError | DbError>;
    readonly update: (id: string, changes: UpdateUserInput) => Effect.Effect<UserRecord, UserNotFoundError | UserInputError | DbError>;
    readonly delete: (id: string) => Effect.Effect<void, UserNotFoundError | DbError>;
    readonly list: () => Effect.Effect<UserRecord[], DbError>;
  }
>() {}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}
```

### 2. Repository Implementation (Infrastructure)

The Prisma implementation provides the actual database operations:

```typescript
// src/infrastructure/prisma/repositories/UserRepositoryPrismaLive.ts
import { Effect, Layer } from 'effect';
import { UserRepository, type UserRecord, type CreateUserInput, DbError } from '@/domain/users/UserRepository';
import { PrismaClientService, PrismaClientLive } from '@/infrastructure/prisma/PrismaClientService';
import { UserNotFoundError, UserAlreadyExistsError, UserInputError } from '@/domain/users/errors';

const toDomain = (u: any): UserRecord => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export const UserRepositoryPrismaLive = Layer.effect(
  UserRepository,
  Effect.gen(function* (_) {
    const { prisma } = yield* _(PrismaClientService);

    return {
      getById: (id: string) =>
        Effect.tryPromise({
          try: () => prisma.user.findUnique({ where: { id } }),
          catch: (e) => new DbError(e),
        }).pipe(
          Effect.flatMap((user) => 
            user ? Effect.succeed(toDomain(user)) : Effect.fail(new UserNotFoundError({ userId: id, message: 'Usuario no encontrado' }))
          )
        ),

      getByEmail: (email: string) =>
        Effect.tryPromise({
          try: () => prisma.user.findUnique({ where: { email } }),
          catch: (e) => new DbError(e),
        }).pipe(
          Effect.flatMap((user) => 
            user ? Effect.succeed(toDomain(user)) : Effect.fail(new UserNotFoundError({ userId: email, message: 'Usuario no encontrado' }))
          )
        ),

      create: (input: CreateUserInput) =>
        Effect.tryPromise({
          try: () => prisma.user.create({
            data: {
              email: input.email,
              name: input.name,
              role: input.role,
              passwordHash: input.passwordHash,
            },
          }),
          catch: (e) => {
            if (e instanceof Error && e.message.includes('Unique constraint failed')) {
              return new UserAlreadyExistsError({ email: input.email, message: 'El email ya está registrado' });
            }
            return new DbError(e);
          },
        }).pipe(Effect.map(toDomain)),

      update: (id: string, changes: UpdateUserInput) =>
        Effect.tryPromise({
          try: () => prisma.user.update({ where: { id }, data: changes }),
          catch: (e) => {
            if (e instanceof Error && e.message.includes('Record to update not found')) {
              return new UserNotFoundError({ userId: id, message: 'Usuario no encontrado' });
            }
            return new DbError(e);
          },
        }).pipe(Effect.map(toDomain)),

      delete: (id: string) =>
        Effect.tryPromise({
          try: () => prisma.user.delete({ where: { id } }),
          catch: (e) => {
            if (e instanceof Error && e.message.includes('Record to delete does not exist')) {
              return new UserNotFoundError({ userId: id, message: 'Usuario no encontrado' });
            }
            return new DbError(e);
          },
        }).pipe(Effect.map(() => undefined)),

      list: () =>
        Effect.tryPromise({
          try: () => prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
          catch: (e) => new DbError(e),
        }).pipe(Effect.map((users) => users.map(toDomain))),
    };
  })
).pipe(Effect.provide(PrismaClientLive));
```

### 3. Service Usage (Domain)

Domain services use repositories through dependency injection:

```typescript
// src/domain/users/UserServiceLive.ts
import { Effect, Layer } from 'effect';
import { UserService } from './UserService';
import { UserRepository } from './UserRepository';
import { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';

export const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* (_) {
    const userRepo = yield* _(UserRepository);
    const icommunitySvc = yield* _(ICommunityService);

    return {
      createUser: (input: CreateUserInput) =>
        Effect.gen(function* (_) {
          // Business logic using repository
          const user = yield* _(userRepo.create(input));
          
          // Additional business operations
          if (input.role === 'ADMIN') {
            yield* _(icommunitySvc.createSignature(user.id));
          }
          
          return user;
        }),

      getUserById: (id: string) =>
        Effect.gen(function* (_) {
          return yield* _(userRepo.getById(id));
        }),

      // ... other methods
    };
  })
);
```

### 4. Action Integration (Actions)

Server actions compose services with dependency injection:

```typescript
// src/actions/users/create.ts
'use server';

import { Effect } from 'effect';
import { UserService } from '@/domain/users/UserService';
import { UserServiceLive } from '@/domain/users/UserServiceLive';
import { UserRepositoryPrismaLive } from '@/infrastructure/prisma/repositories/UserRepositoryPrismaLive';
import { PrismaClientLive } from '@/infrastructure/prisma/PrismaClientService';
import { ICommunityServiceLive } from '@/infrastructure/icommunity/ICommunityServiceLive';

export async function createUser(input: CreateUserInput): Promise<{ success: boolean; data?: UserRecord; error?: string }> {
  const program = Effect.gen(function* (_) {
    const svc = yield* _(UserService);
    return yield* _(svc.createUser(input));
  }).pipe(
    Effect.provide(UserServiceLive),
    Effect.provide(UserRepositoryPrismaLive),
    Effect.provide(PrismaClientLive),
    Effect.provide(ICommunityServiceLive)
  );

  try {
    const user = await Effect.runPromise(program);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Available Repositories

### UserRepository
- **Purpose**: User management and authentication
- **Methods**: `getById`, `getByEmail`, `create`, `update`, `delete`, `list`
- **Special Features**: Password hash management, role-based operations

### ItemRepository
- **Purpose**: Item creation and management
- **Methods**: `getById`, `getDetails`, `create`, `updateEvidenceId`, `delete`, `listForExport`
- **Special Features**: Evidence integration, template management

### StateRepository
- **Purpose**: State creation and tracking
- **Methods**: `getById`, `create`, `updateEvidenceId`, `delete`, `listByItem`, `update`
- **Special Features**: Evidence integration, backup tracking

### CategoryRepository
- **Purpose**: Category management
- **Methods**: `getById`, `getByIdWithDetails`, `create`, `update`, `delete`, `list`
- **Special Features**: Dependency checking, template management

### StatusTypeRepository
- **Purpose**: Status type management
- **Methods**: `getById`, `create`, `update`, `delete`, `list`, `listByCategory`
- **Special Features**: Category association, dependency checking

## Testing Strategy

### Repository Tests

Test repositories with mocked implementations:

```typescript
// src/infrastructure/prisma/repositories/__tests__/UserRepositoryPrismaLive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit } from 'effect';
import { UserRepository, DbError } from '@/domain/users/UserRepository';
import { UserNotFoundError } from '@/domain/users/errors';

const mockUserRepository = {
  getById: vi.fn(),
  getByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

describe('UserRepositoryPrismaLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user when found', async () => {
    const userData = createUserFixture();
    mockUserRepository.getById.mockReturnValue(Effect.succeed(userData));

    const program = Effect.gen(function* (_) {
      const repo = yield* _(UserRepository);
      return yield* _(repo.getById('user-123'));
    }).pipe(
      Effect.provide(Layer.succeed(UserRepository, mockUserRepository))
    );

    const result = await Effect.runPromise(program);
    expect(result).toEqual(userData);
    expect(mockUserRepository.getById).toHaveBeenCalledWith('user-123');
  });

  it('should throw UserNotFoundError when user not found', async () => {
    mockUserRepository.getById.mockReturnValue(
      Effect.fail(new UserNotFoundError({ userId: 'user-123', message: 'Usuario no encontrado' }))
    );

    const program = Effect.gen(function* (_) {
      const repo = yield* _(UserRepository);
      return yield* _(repo.getById('user-123'));
    }).pipe(
      Effect.provide(Layer.succeed(UserRepository, mockUserRepository))
    );

    await expect(Effect.runPromiseExit(program)).resolves.toEqual(
      Exit.fail(new UserNotFoundError({ userId: 'user-123', message: 'Usuario no encontrado' }))
    );
  });
});
```

### Service Tests

Test domain services with mocked repositories:

```typescript
// src/domain/users/__tests__/UserService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit } from 'effect';
import { UserService } from '../UserService';
import { UserRepository } from '../UserRepository';
import { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';

const mockUserRepository = { /* ... */ };
const mockICommunityService = { /* ... */ };

describe('UserService', () => {
  it('should create user successfully', async () => {
    const userData = createUserFixture();
    mockUserRepository.create.mockReturnValue(Effect.succeed(userData));

    const program = Effect.gen(function* (_) {
      const svc = yield* _(UserService);
      return yield* _(svc.createUser({
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      }));
    }).pipe(
      Effect.provide(UserServiceLive),
      Effect.provide(Layer.succeed(UserRepository, mockUserRepository)),
      Effect.provide(Layer.succeed(ICommunityService, mockICommunityService))
    );

    const result = await Effect.runPromise(program);
    expect(result).toEqual(userData);
  });
});
```

## Benefits

### 1. Clean Architecture
- **Domain logic** is separated from database concerns
- **Infrastructure** is isolated and swappable
- **Dependencies** flow in one direction

### 2. Testability
- **Easy mocking** of repository interfaces
- **Isolated testing** of business logic
- **No database dependencies** in unit tests

### 3. Type Safety
- **Compile-time checks** for repository contracts
- **Effect.ts error handling** with typed errors
- **IntelliSense support** for all operations

### 4. Maintainability
- **Single responsibility** for each layer
- **Clear interfaces** between components
- **Easy to extend** with new operations

## Migration Guide

When migrating existing code to use repositories:

1. **Identify direct Prisma usage** in domain services
2. **Define repository interface** with required methods
3. **Implement PrismaLive** version of repository
4. **Update domain service** to use repository interface
5. **Update actions** to provide repository layer
6. **Add comprehensive tests** for all layers
7. **Remove direct Prisma imports** from domain layer

## Lint Rules

The project enforces repository pattern usage:

```javascript
// eslint.config.mjs
{
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@prisma/client",
            "message": "Prisma imports are only allowed in the infrastructure layer. Use repository interfaces instead."
          },
          {
            "name": "prisma",
            "message": "Prisma imports are only allowed in the infrastructure layer. Use repository interfaces instead."
          }
        ]
      }
    ]
  }
},
{
  files: ["src/infrastructure/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": "off"
  }
}
```

This ensures that:
- ❌ **Direct Prisma imports** are blocked outside infrastructure
- ✅ **Repository interfaces** are used in domain layer
- ✅ **Prisma imports** are allowed in infrastructure layer
