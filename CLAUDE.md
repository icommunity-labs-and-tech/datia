# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm run lint             # ESLint

# Database (Prisma)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema without migrations
npm run db:migrate:dev   # Create & run migrations (dev)
npm run db:studio        # Open Prisma Studio

# Testing
npm test                 # Run all unit tests (Vitest)
npm test -- categories   # Run tests matching "categories"
npm test -- --watch      # Watch mode
npm test:coverage        # Coverage report

# E2E Testing (Playwright)
npm run test:e2e         # Run E2E tests
npm run test:e2e:headed  # Headed browser mode
npm run test:e2e:ui      # Playwright UI
```

## Architecture Overview

This project follows **Hexagonal Architecture (Ports & Adapters)** with **Domain-Driven Design**:

```
src/
├── domain/           # Pure business logic, no external dependencies
├── infrastructure/   # Prisma repositories, external APIs (iCommunity, GCS)
├── actions/          # Next.js Server Actions (orchestration layer)
├── components/       # React components
├── app/              # Next.js App Router pages
└── lib/              # Shared utilities, auth, services
```

### Layer Responsibilities

- **Domain** (`src/domain/`): Business logic, repository interfaces, typed errors (ES6 classes with `_tag`), services as factory functions (`createXxxServiceImpl`)
- **Infrastructure** (`src/infrastructure/`): Prisma repository implementations, API clients
- **Actions** (`src/actions/`): Server actions that orchestrate domain services with dependency injection

## Multi-Tenancy

All data is scoped by `organizationId`. Critical patterns:

```typescript
// Always use tenant helper in server actions
import { requireOrganizationId } from "@/lib/auth/tenant";
const organizationId = await requireOrganizationId();

// All repository methods filter by organizationId
itemRepository.findByOrganization(organizationId);
itemRepository.getById(id, organizationId);
```

**User Roles:** `SUPER_ADMIN` (system-wide), `ADMIN` (organization), `USER` (operator)

## Key Constraints

- **Never import `@prisma/client` outside `src/infrastructure/`** — ESLint enforces this
- **Never use `fetch()` directly in domain/actions** — use services in `src/lib/services/`
- **Components must not import from Prisma** — use typed interfaces from domain
- **All async code uses native async/await** — no Effect.ts or external effect libraries
- **Dependency injection via factory functions** — not decorators or DI containers

## Authentication

Three separate JWT contexts with different secrets and cookies:

| Context | Login Route | Cookie | Secret Env Var |
|---------|-------------|--------|----------------|
| Admin | `/auth/admin/login` | `admin-auth-token` | `DASHBOARD_JWT_SECRET` |
| Operator | `/auth/operator/login` | `operator-auth-token` | `OPERATOR_JWT_SECRET` |
| Super Admin | `/auth/superadmin/login` | `superadmin-auth-token` | `SUPERADMIN_JWT_SECRET` |

## Error Handling Pattern

Domain errors use ES6 classes with `_tag` property:

```typescript
export class ItemNotFoundError extends Error {
  readonly _tag = "ItemNotFoundError";
  constructor(id: string) {
    super(`Item not found: ${id}`);
  }
}
```

## Testing Structure

```
src/domain/{entity}/__tests__/           # Domain service tests
src/infrastructure/prisma/repositories/__tests__/  # Repository tests
src/actions/__tests__/{entity}/          # Server action tests
src/test/fixtures/                       # Test data factories
src/test/mocks/                          # Centralized mocks
```

## Path Alias

Use `@/` for imports from `src/`:
```typescript
import { prisma } from "@/lib/prisma";
import { createItemServiceImpl } from "@/domain/items/ItemServiceImpl";
```

## Internationalisation (i18n)

Locale files: `src/i18n/messages/es.json` and `src/i18n/messages/en.json`

**Rules — enforce on every frontend change:**

- Never hardcode user-visible strings in components. Always use `useTranslations` and `t('key')`.
- When **adding** UI text: add the key to **both** locale files in the same change.
- When **removing** UI elements: delete the corresponding keys from both locale files. Before deleting, search all files in the namespace to confirm no other component uses the key.
- Keep keys minimal — no stale keys for removed features.

## Workflow

After implementing a new feature or change, always run `npm run build` to verify the project compiles correctly before committing.