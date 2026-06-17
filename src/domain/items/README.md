# Items Domain Service

Handles item creation and business rules using Effect.ts.

## Purpose

The Items service manages the complete item creation flow including:

- **Input validation** and parsing
- **Business rule enforcement** (unique IDs, user verification)
- **Database operations** with declarative rollback
- **Evidence creation** integration
- **Cache invalidation** for UI updates

## Interface

```typescript
export class ItemService extends Context.Tag('ItemService')<
  ItemService,
  {
    readonly createItem: (data: CreateItemRequest) => Effect<ItemResponse, ItemError>;
  }
>() {}
```

## Methods

### `createItem(data: CreateItemRequest)`
Complete item creation flow:
1. **Validation**: Checks required fields and business rules
2. **User Verification**: Ensures user has valid signature and KYC status
3. **Database Creation**: Creates item with rollback capability
4. **Evidence Creation**: Generates and submits evidence to iCommunity
5. **Update**: Links evidence ID to item
6. **Cache Invalidation**: Refreshes UI cache

## Types

### `CreateItemRequest`
```typescript
interface CreateItemRequest {
  name: string;
  description: string;
  categoryId: string;
  customId: string;
  imageUrl?: string;
  templateFields?: Record<string, any>;
  itemTemplate?: any;
}
```

### `ItemResponse`
```typescript
interface ItemResponse {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl?: string;
  itemTemplate?: any;
}
```

## Error Types

- **`ItemInputError`** - Missing required fields (name, categoryId, customId)
- **`ItemAlreadyExistsError`** - Duplicate item ID
- **`UserNotVerifiedError`** - User lacks signature or KYC verification
- **`ItemCreationRollbackError`** - Failed to rollback after evidence failure

## Business Rules

1. **Unique ID**: Item ID must be unique across the system
2. **User Verification**: User must have valid signature and VERIFIED status
3. **Required Fields**: Name, description, and category are mandatory
4. **Rollback**: If evidence creation fails, item is automatically deleted

## Dependencies

- **`EvidenceService`** - For evidence creation
- **`@/lib/prisma`** - Database operations
- **`@/lib/auth/shared/session`** - User authentication
- **`next/cache`** - Cache invalidation

## Usage

```typescript
import { ItemService } from '@/domain/items/ItemService';
import { ItemServiceLive } from '@/domain/items/ItemServiceLive';

const program = Effect.gen(function* (_) {
  const itemService = yield* _(ItemService);
  return yield* _(itemService.createItem({
    name: 'Test Item',
    description: 'Test Description',
    categoryId: 'cat-123',
    customId: 'item-123',
    imageUrl: 'https://example.com/image.jpg'
  }));
}).pipe(Effect.provide(ItemServiceLive));
```

## Implementation Details

- **Declarative Rollback**: Uses `Effect.acquireRelease` for automatic cleanup
- **Span Tracing**: Includes `item-creation.program` and `item-creation.evidence.create` spans
- **Error Mapping**: Converts infrastructure errors to domain errors
- **Retry Logic**: Inherits retry behavior from Evidence service
