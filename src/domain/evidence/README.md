# Evidence Domain Service

Handles evidence creation for assets and certifications.

## Purpose

The Evidence service replaces the legacy `EvidenceBuilder` class with a type-safe, composable Effect.ts implementation that provides:

- **Image processing** with concurrency control
- **Retry logic** for external API calls
- **Timeout protection** for network operations
- **Type-safe error handling** with domain-specific errors
- **Observability** with spans and logging

## Interface

```typescript
export class EvidenceService extends Context.Tag('EvidenceService')<
  EvidenceService,
  {
    readonly createItemEvidence: (input: EvidencePayloadInput) => Effect<string, EvidenceError>;
    readonly createCertificationEvidence: (input: EvidencePayloadInput) => Effect<string, EvidenceError>;
  }
>() {}
```

## Methods

### `createItemEvidence(input)`
Creates evidence for item creation operations:
- Processes item images and metadata
- Generates `item_data.json` file
- Calls iCommunity API to create evidence
- Returns evidence ID

### `createCertificationEvidence(input)`
Creates the evidence a certification anchors:
- Processes the certified payload and its metadata  
- Generates `issue_data.json` file
- Calls iCommunity API to create evidence
- Returns evidence ID

## Error Types

- **`EvidenceInputError`** - Missing required fields (signatureID, title, metadata)
- **`ImageFetchError`** - Failed to fetch image URLs
- **`ImageSizeExceededError`** - Total evidence size exceeds limit
- **`EvidenceBuildError`** - File generation failed

## Dependencies

- **`ICommunityService`** - For API calls to create evidence
- **`@/lib/evidenceUtils`** - For JSON file generation
- **`@/lib/http`** - For URL utilities

## Usage

```typescript
import { EvidenceService } from '@/domain/evidence/EvidenceService';
import { EvidenceServiceLive } from '@/domain/evidence/EvidenceServiceLive';

const program = Effect.gen(function* (_) {
  const evidence = yield* _(EvidenceService);
  return yield* _(evidence.createItemEvidence({
    signatureID: 'sig-123',
    title: 'Item Creation',
    description: 'Creating new item',
    imageUrls: ['https://example.com/image.jpg'],
    metadata: { type: 'item_creation', assetId: 'item-123' }
  }));
}).pipe(Effect.provide(EvidenceServiceLive));
```

## Implementation Details

- **Concurrency Control**: Processes up to 4 images concurrently
- **Retry Logic**: 3 attempts with exponential backoff for image fetching
- **Timeout**: 10 seconds per image, 30 seconds for API calls
- **Size Limits**: Enforces `MAX_EVIDENCE_BYTES` limit
- **Rollback**: Automatic cleanup on failure
