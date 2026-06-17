# iCommunity API Service

Provides type-safe access to the iCommunity API for evidence and signature management.

## Purpose

The iCommunity service handles all interactions with the iCommunity API including:

- **Evidence creation** with file uploads
- **Signature management** and creation
- **API authentication** using IBS_TOKEN
- **Error handling** with retry logic
- **Request/response mapping** to domain types

## Interface

```typescript
export class ICommunityService extends Context.Tag('ICommunityService')<
  ICommunityService,
  {
    readonly createEvidence: (
      signatureID: string,
      title: string,
      files: EvidenceFile[]
    ) => Effect<string, ICommunityError>;
    readonly createSignature: (
      name: string,
      okUrl?: string,
      koUrl?: string
    ) => Effect<{signature_id: string; url?: string}, ICommunityError>;
  }
>() {}
```

## Methods

### `createEvidence(signatureID, title, files)`
Creates evidence in iCommunity:
- **Authentication**: Uses IBS_TOKEN from environment
- **File Upload**: Sends base64-encoded files
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Mapping**: Converts HTTP errors to typed errors
- **Returns**: Evidence ID for tracking

### `createSignature(name, okUrl?, koUrl?)`
Creates signature in iCommunity:
- **Signature Creation**: Creates new signature with optional wizard URLs
- **Configuration**: Handles wizard setup for KYC flow
- **Returns**: Signature ID and optional wizard URL

## Error Types

- **`ICommunityConfigError`** - Missing or invalid IBS_TOKEN
- **`ICommunityHTTPError`** - API errors with status codes and response bodies

## Configuration

Requires environment variable:
- **`IBS_TOKEN`** - iCommunity API authentication token

## API Endpoints

- **`POST /evidences`** - Create evidence with files
- **`POST /signatures`** - Create signature

## Usage

```typescript
import { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';
import { ICommunityServiceLive } from '@/infrastructure/icommunity/ICommunityServiceLive';

const program = Effect.gen(function* (_) {
  const icommunity = yield* _(ICommunityService);
  
  // Create evidence
  const evidenceId = yield* _(icommunity.createEvidence(
    'sig-123',
    'Item Creation',
    [{ name: 'data.json', file: 'base64data' }]
  ));
  
  // Create signature
  const signature = yield* _(icommunity.createSignature(
    'User Signature',
    'https://ok.url',
    'https://ko.url'
  ));
  
  return { evidenceId, signatureId: signature.signature_id };
}).pipe(Effect.provide(ICommunityServiceLive));
```

## Implementation Details

- **Base URL**: `https://api.icommunitylabs.com/v2`
- **Authentication**: Bearer token in Authorization header
- **Retry**: 3 attempts with exponential backoff (200ms, 400ms, 800ms)
- **Timeout**: Built into Effect.ts retry mechanism
- **Error Handling**: Maps HTTP status codes to domain errors
- **Request Format**: JSON with proper Content-Type headers

## Testing

The service is tested with:
- **Mock fetch** for API calls
- **Environment variable mocking** for IBS_TOKEN
- **Error scenario testing** for various HTTP status codes
- **Success path testing** with realistic response data
