# Actions Layer

This directory contains Next.js server actions that orchestrate domain services for user-facing operations.

## Architecture

The actions layer provides:
- **Server Actions** for Next.js form handling
- **Input validation** and parsing
- **Domain service orchestration** 
- **Error mapping** from domain to user-friendly messages
- **Response formatting** for UI consumption

## Structure

```
actions/
├── items/              # Item-related operations
├── states/             # State-related operations
├── upload/             # File upload operations
└── shared/             # Shared action utilities (future)
```

## Pattern

Each action follows this pattern:

1. **Parse Input**: Convert form data to domain types
2. **Validate**: Check required fields and business rules
3. **Orchestrate**: Call domain services with Effect.ts
4. **Map Errors**: Convert domain errors to user messages
5. **Format Response**: Return data in UI-friendly format

## Key Principles

1. **Thin Layer**: Minimal logic, delegate to domain services
2. **Error Mapping**: Convert domain errors to user-friendly messages
3. **Type Safety**: Use domain types for input/output
4. **Effect Composition**: Compose domain services with Effect.ts
5. **Backward Compatibility**: Maintain existing API contracts

## Usage Example

```typescript
'use server';

import { Effect } from 'effect';
import { ItemService } from '@/domain/items/ItemService';
import { ItemServiceLive } from '@/domain/items/ItemServiceLive';

export async function addItem(formData: Record<string, any>) {
  try {
    const program = Effect.gen(function* (_) {
      const itemService = yield* _(ItemService);
      return yield* _(itemService.createItem(parseInput(formData)));
    }).pipe(Effect.provide(ItemServiceLive));

    const result = await Effect.runPromise(program);
    return formatResponse(result);
  } catch (error) {
    throw new Error(mapDomainError(error));
  }
}
```

## Error Handling

Actions map domain errors to user-friendly messages:

- **`ItemInputError`** → "El nombre es obligatorio"
- **`ItemAlreadyExistsError`** → "El ID ya existe. Elige otro."
- **`UserNotVerifiedError`** → "Completa el KYC antes de crear items"
- **`ItemCreationRollbackError`** → "Error al crear evidencia"

## Dependencies

Actions depend on:
- **Domain services** for business logic
- **Effect.ts** for composition and error handling
- **Next.js** for server action functionality
- **Type definitions** from domain layer

## Testing

Actions are tested with:
- **Integration tests** using real domain services
- **Error scenario testing** with mocked failures
- **Input validation testing** with various form data
- **Response format testing** for UI compatibility
