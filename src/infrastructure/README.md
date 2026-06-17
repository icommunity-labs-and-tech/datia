# Infrastructure Layer

This directory contains concrete implementations of external services and infrastructure concerns, separated from business logic.

## Architecture

The infrastructure layer provides:
- **Concrete implementations** of external APIs and services
- **Configuration management** (environment variables, API keys)
- **Network operations** with retry, timeout, and error handling
- **Database access** (via Prisma)
- **File storage** operations

## Structure

```
infrastructure/
├── icommunity/         # iCommunity API client
├── storage/            # File storage (Google Cloud Storage)
└── database/           # Database utilities (future)
```

## Services

Each infrastructure service follows this pattern:

- **`Service.ts`** - Defines the service interface using `Context.Tag`
- **`ServiceLive.ts`** - Provides the concrete implementation
- **`errors.ts`** - Infrastructure-specific error types
- **`__tests__/`** - Unit tests with mocked external dependencies

## Key Principles

1. **Infrastructure Concerns Only**: No business logic
2. **Effect-First**: All operations return `Effect` for composability
3. **Error Mapping**: Converts external errors to typed errors
4. **Retry & Timeout**: Built-in resilience for external calls
5. **Configuration**: Environment-based configuration with validation

## Usage Example

```typescript
import { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';
import { ICommunityServiceLive } from '@/infrastructure/icommunity/ICommunityServiceLive';

const program = Effect.gen(function* (_) {
  const icommunity = yield* _(ICommunityService);
  return yield* _(icommunity.createEvidence('sig-123', 'Title', files));
}).pipe(
  Effect.provide(ICommunityServiceLive)
);
```

## Dependencies

Infrastructure services depend on:
- **Environment variables** for configuration
- **External APIs** (iCommunity, Google Cloud Storage)
- **Effect.ts** for all effectful operations
- **Node.js built-ins** (fetch, Buffer, etc.)

## Testing

Infrastructure services are tested with:
- **Mock external dependencies** (fetch, APIs)
- **Environment variable mocking**
- **Error scenario testing**
- **Integration tests** with real services (optional)
