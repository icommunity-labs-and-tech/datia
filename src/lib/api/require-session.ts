import { NextResponse } from 'next/server';
import { requireOrganizationId, TenantContextNotFoundError } from '@/lib/auth/tenant';

/**
 * The middleware matcher leaves /api out, so a route that is not public has to
 * check the session itself. Returns the organisation, or the 401 to send back.
 *
 * The actions behind these routes already call requireOrganizationId, but a
 * missing session surfaced there as a 500 or a 404 instead of a 401 (#31).
 *
 *   const session = await requireSessionOrganization();
 *   if (session instanceof NextResponse) return session;
 */
export async function requireSessionOrganization(): Promise<string | NextResponse> {
  try {
    return await requireOrganizationId();
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
}
