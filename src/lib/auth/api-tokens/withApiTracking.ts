import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken, ApiTokenAuthResult } from './middleware';
import { trackApiCall } from './trackApiCall';
import { runInSandbox } from '@/lib/sandbox/context';

/**
 * Wrapper for API route handlers that automatically tracks API calls.
 *
 * Sandbox requests (authenticated via filesystem token) skip DB tracking
 * entirely and run inside the sandbox async context so that any code
 * deeper in the stack can detect the sandbox mode via `isSandboxRequest()`.
 *
 * Usage:
 * ```ts
 * export const GET = withApiTracking(async (request, auth, params) => {
 *   // Your route logic here
 *   return NextResponse.json(data, { status: 200 });
 * });
 * ```
 */
export function withApiTracking<T extends Record<string, any>>(
  handler: (
    request: NextRequest,
    auth: ApiTokenAuthResult,
    params: T
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<T> }
  ): Promise<NextResponse> => {
    // Validate API token (checks filesystem sandbox store first, then DB)
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const method = request.method;
    const path = new URL(request.url).pathname;

    // ── Sandbox: skip tracking, run in sandbox context ────────────────────
    if (auth.isSandbox) {
      return runInSandbox(() => handler(request, auth, params));
    }

    // ── Production: execute handler + fire-and-forget tracking ───────────
    try {
      const response = await handler(request, auth, params);

      trackApiCall({
        apiTokenId: auth.tokenId,
        organizationId: auth.organizationId,
        method,
        path,
        statusCode: response.status,
      }).catch(() => {
        // Silently ignore tracking errors
      });

      return response;
    } catch (error) {
      const statusCode =
        error instanceof Error && 'status' in error
          ? (error as any).status
          : 500;

      trackApiCall({
        apiTokenId: auth.tokenId,
        organizationId: auth.organizationId,
        method,
        path,
        statusCode,
      }).catch(() => {
        // Silently ignore tracking errors
      });

      throw error;
    }
  };
}
