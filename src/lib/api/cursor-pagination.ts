/**
 * Types and utilities for cursor-based pagination
 */

export interface CursorPaginationParams {
  cursor?: string; // ID of the last item from the previous page
  limit?: number; // Maximum number of items to return (default: 20, max: 100)
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null; // ID of the last item in this page, null if no more pages
  hasNextPage: boolean;
}

/**
 * Parse and validate pagination parameters from query string
 */
export function parseCursorPaginationParams(searchParams: URLSearchParams): CursorPaginationParams {
  const cursor = searchParams.get('cursor') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 20;

  return {
    cursor,
    limit,
  };
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T extends { id: string }>(
  items: T[],
  requestedLimit: number
): CursorPaginationResult<T> {
  const hasNextPage = items.length > requestedLimit;
  const data = hasNextPage ? items.slice(0, requestedLimit) : items;
  const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

  return {
    data,
    nextCursor: hasNextPage ? nextCursor : null,
    hasNextPage,
  };
}

