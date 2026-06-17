# Domain Layer

This directory contains the core business logic of the application, implemented using Effect.ts for type-safe error handling and composable effects.

## Architecture

The domain layer follows Domain-Driven Design (DDD) principles and uses Effect.ts to handle:
- **Type-safe error handling** with `Data.TaggedError`
- **Dependency injection** with `Context.Tag` and `Layer`
- **Composable effects** for complex business flows
- **Declarative rollback** using `Effect.acquireRelease`
- **Observability** with spans and logging

## Structure

```
domain/
├── evidence/           # Evidence creation and management
├── items/              # Item creation and business rules
├── states/             # State creation and management
└── shared/             # Shared domain utilities (future)
```

## Services

Each domain service follows this pattern:

- **`Service.ts`** - Defines the service interface using `Context.Tag`
- **`ServiceLive.ts`** - Provides the concrete implementation with Effect.ts
- **`errors.ts`** - Domain-specific error types
- **`__tests__/`** - Unit tests with mocked dependencies

## Key Principles

1. **Pure Business Logic**: No infrastructure concerns (DB, HTTP, etc.)
2. **Effect-First**: All operations return `Effect` for composability
3. **Type Safety**: Compile-time error checking with tagged errors
4. **Testability**: Easy mocking with dependency injection
5. **Observability**: Built-in spans and logging for monitoring

## Usage Example

```typescript
import { ItemService } from '@/domain/items/ItemService';
import { ItemServiceLive } from '@/domain/items/ItemServiceLive';

const program = Effect.gen(function* (_) {
  const itemService = yield* _(ItemService);
  return yield* _(itemService.createItem(request));
}).pipe(
  Effect.provide(ItemServiceLive)
);

const result = await Effect.runPromise(program);
```

## Dependencies

Domain services depend on:
- **Infrastructure services** (ICommunity, Storage) via `Context.Tag`
- **Shared utilities** (validation, business rules)
- **Effect.ts** for all effectful operations

## Testing

Domain services are tested with:
- **Mock implementations** of infrastructure dependencies
- **Effect.runPromiseExit** for error testing
- **Layer composition** for dependency injection in tests
