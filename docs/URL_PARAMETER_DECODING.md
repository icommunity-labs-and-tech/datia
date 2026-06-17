# URL Parameter Decoding in API Routes

## Problem

When accessing items with IDs that contain special characters (spaces, accents, etc.) through URLs, the parameters can be URL-encoded one or multiple times, causing database lookups to fail.

### Example

An item with ID `batería - 123456` can appear in URLs as:
- Single encoded: `bater%C3%ADa%20-%20123456`
- Double encoded: `bater%25C3%25ADa%2520-%2520123456`

When Next.js receives these parameters in dynamic routes (e.g., `/api/customer/item/[code]`), it may partially decode them, but not always completely, especially in cases of double encoding.

## Solution

We've created a utility function `decodeUrlParam` that iteratively decodes URL parameters until they're fully decoded, handling cases of:
- Single encoding
- Double encoding
- Already decoded strings
- Malformed URIs (gracefully falls back to original value)

### Usage

```typescript
import { decodeUrlParam } from '@/lib/api/decode-param';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeUrlParam(rawId);
  
  // Now use the decoded id for database lookups
  const item = await prisma.item.findUnique({
    where: { id },
  });
  
  // ...
}
```

## Updated Files

The following API routes have been updated to use `decodeUrlParam`:

1. `/api/customer/item/[code]/route.ts` - Customer-facing item lookup
2. `/api/items/[id]/route.ts` - Internal item API
3. `/api/checker/item/[itemId]/route.ts` - Checker verification API
4. `/api/v1/items/[id]/route.ts` - Public API v1 item endpoint

## When to Use

Apply `decodeUrlParam` to any API route that:
- Receives an ID as a URL parameter (not query string)
- The ID may contain special characters, spaces, or accents
- The ID is used for database lookups

## When NOT to Use

- Query parameters (Next.js handles these automatically)
- Server actions (they receive already-processed parameters)
- Client-side route navigation (use proper encoding when constructing URLs)

## Testing

The function has been tested with:
- Single-encoded strings
- Double-encoded strings
- Already-decoded strings
- Simple alphanumeric IDs
- Special characters (@, #, /, etc.)
- Malformed URIs

See `src/lib/api/__tests__/decode-param.test.ts` for test cases.

## Best Practices

1. **Always decode** URL parameters before database lookups
2. **Log the decoded value** for debugging purposes
3. **Handle errors gracefully** - the function returns the original value if decoding fails
4. **Don't decode query parameters** - Next.js handles those correctly

## Related Issues

This fix resolves the issue where items with special characters in their IDs couldn't be accessed through the customer-facing URL (`/customer/item/[id]`), resulting in "Item not found" errors even though the item existed in the database.

