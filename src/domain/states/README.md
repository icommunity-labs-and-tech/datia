# States Domain Service

Handles state creation and management using Effect.ts.

## Purpose

The States service manages the complete state creation flow including:

- **Input validation** and parsing
- **User verification** and signature validation
- **Database operations** with declarative rollback
- **Evidence creation** integration
- **Cache invalidation** for UI updates

## Interface

```typescript
export class StateService extends Context.Tag('StateService')<
  StateService,
  {
    readonly createState: (data: CreateStateRequest) => Effect<StateResponse, StateError>;
  }
>() {}
```

## Methods

### `createState(data: CreateStateRequest)`
Complete state creation flow:
1. **Validation**: Checks required fields and business rules
2. **User Verification**: Ensures user has valid signature and KYC status
3. **Title Generation**: Creates state title using business logic
4. **Database Creation**: Creates state with rollback capability
5. **Evidence Creation**: Generates and submits evidence to iCommunity
6. **Update**: Links evidence ID to state
7. **Cache Invalidation**: Refreshes UI cache

## Types

### `CreateStateRequest`
```typescript
interface CreateStateRequest {
  name: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
}
```

### `StateResponse`
```typescript
interface StateResponse {
  id: string;
  name: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls: string[];
}
```

## Error Types

- **`StateInputError`** - Missing required fields (name, description, statusTypeId, itemId)
- **`StateAlreadyExistsError`** - Duplicate state ID
- **`UserNotVerifiedError`** - User lacks signature or KYC verification
- **`StateCreationRollbackError`** - Failed to rollback after evidence failure

## Business Rules

1. **User Verification**: User must have valid signature and VERIFIED status
2. **Required Fields**: Name, description, statusTypeId, and itemId are mandatory
3. **Title Generation**: State title is generated from name and description
4. **Rollback**: If evidence creation fails, state is automatically deleted

## Dependencies

- **`EvidenceService`** - For evidence creation
- **`@/lib/prisma`** - Database operations
- **`@/lib/auth/shared/session`** - User authentication
- **`@/domain/states/stateUtils`** - Title generation utilities
- **`next/cache`** - Cache invalidation

## Usage

```typescript
import { StateService } from '@/domain/states/StateService';
import { StateServiceLive } from '@/domain/states/StateServiceLive';

const program = Effect.gen(function* (_) {
  const stateService = yield* _(StateService);
  return yield* _(stateService.createState({
    name: 'Test State',
    description: 'Test Description',
    statusTypeId: 'status-123',
    itemId: 'item-123',
    imageUrls: ['https://example.com/image.jpg'],
    metadata: { type: 'state_creation', stateId: 'state-123' }
  }));
}).pipe(Effect.provide(StateServiceLive));
```

## Implementation Details

- **Declarative Rollback**: Uses `Effect.acquireRelease` for automatic cleanup
- **Span Tracing**: Includes `state-creation.program` and `state-creation.evidence.create` spans
- **Error Mapping**: Converts infrastructure errors to domain errors
- **Retry Logic**: Inherits retry behavior from Evidence service
- **Title Generation**: Uses `generateStateTitle` utility for consistent naming
