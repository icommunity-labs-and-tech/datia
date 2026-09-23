# Assets Domain Service

Handles asset creation and business rules using Effect.ts.

## Purpose

The Items service manages the complete asset creation flow including:

- **Input validation** and parsing
- **Business rule enforcement** (unique IDs, user verification)
- **Database operations** with declarative rollback
- **Evidence creation** integration
- **Cache invalidation** for UI updates

## Interface

```typescript
export class AssetService extends Context.Tag('AssetService')<
  AssetService,
  {
    readonly createItem: (data: CreateAssetRequest) => Effect<AssetResponse, ItemError>;
  }
>() {}
```

## Methods

### `createItem(data: CreateAssetRequest)`
Complete asset creation flow:
1. **Validation**: Checks required fields and business rules
2. **User Verification**: Ensures user has valid signature and KYC status
3. **Database Creation**: Creates asset with rollback capability
4. **Evidence Creation**: Generates and submits evidence to iCommunity
5. **Update**: Links evidence ID to asset
6. **Cache Invalidation**: Refreshes UI cache

## Types

### `CreateAssetRequest`
```typescript
interface CreateAssetRequest {
  name: string;
  description: string;
  categoryId: string;
  customId: string;
  imageUrl?: string;
  templateFields?: Record<string, any>;
  itemTemplate?: any;
}
```

### `AssetResponse`
```typescript
interface AssetResponse {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl?: string;
  itemTemplate?: any;
}
```

## Error Types

- **`AssetInputError`** - Missing required fields (name, categoryId, customId)
- **`AssetAlreadyExistsError`** - Duplicate asset ID
- **`UserNotVerifiedError`** - User lacks signature or KYC verification
- **`AssetCreationRollbackError`** - Failed to rollback after evidence failure

## Business Rules

1. **Unique ID**: Asset ID must be unique across the system
2. **User Verification**: User must have valid signature and VERIFIED status
3. **Required Fields**: Name, description, and category are mandatory
4. **Rollback**: If evidence creation fails, asset is automatically deleted

## Dependencies

- **`EvidenceService`** - For evidence creation
- **`@/lib/prisma`** - Database operations
- **`@/lib/auth/shared/session`** - User authentication
- **`next/cache`** - Cache invalidation

## Usage

```typescript
import { AssetService } from '@/domain/assets/AssetService';
import { ItemServiceLive } from '@/domain/assets/ItemServiceLive';

const program = Effect.gen(function* (_) {
  const itemService = yield* _(AssetService);
  return yield* _(itemService.createItem({
    name: 'Test Asset',
    description: 'Test Description',
    categoryId: 'cat-123',
    customId: 'asset-123',
    imageUrl: 'https://example.com/image.jpg'
  }));
}).pipe(Effect.provide(ItemServiceLive));
```

## Implementation Details

- **Declarative Rollback**: Uses `Effect.acquireRelease` for automatic cleanup
- **Span Tracing**: Includes `asset-creation.program` and `asset-creation.evidence.create` spans
- **Error Mapping**: Converts infrastructure errors to domain errors
- **Retry Logic**: Inherits retry behavior from Evidence service
