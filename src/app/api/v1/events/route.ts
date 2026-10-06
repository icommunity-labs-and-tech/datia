import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { authScope } from '@/lib/scope';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { parseCursorPaginationParams } from '@/lib/api/cursor-pagination';

export async function GET(request: NextRequest) {
  try {
    // Validate API token
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paginationParams = parseCursorPaginationParams(searchParams);
    const eventType = searchParams.get('eventType') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;

    // The token says whose events these are; the session cookie, if the caller
    // happens to carry one, must not.
    const result = await eventRepository.listPaginated(authScope(auth), {
      ...paginationParams,
      eventType,
      entityType,
      entityId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

