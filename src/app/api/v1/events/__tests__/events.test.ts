import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The events endpoints used to authenticate with the API token and then read
 * the organisation from the session cookie: a caller with only a token got an
 * error, and one who also carried a dashboard cookie got that cookie's events.
 * The token is what says whose events these are.
 */

const { mockValidateApiToken, mockListPaginated, mockGetById } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockListPaginated: vi.fn(),
  mockGetById: vi.fn(),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({ validateApiToken: mockValidateApiToken }));
vi.mock('@/infrastructure/prisma/repositories/EventRepositoryPrisma', () => ({
  eventRepository: { listPaginated: mockListPaginated, getById: mockGetById },
}));
// No session at all: reading one here would throw.
vi.mock('next/headers', () => ({
  cookies: async () => {
    throw new Error('the events API must not read the session');
  },
}));

import * as list from '../route';
import * as one from '../[id]/route';

const token = { organizationId: 'org-1', companyId: 'co-1', tokenId: 't-1', isSandbox: false };
const scope = { organizationId: 'org-1', companyId: 'co-1' };

describe('GET /api/v1/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue(token);
    mockListPaginated.mockResolvedValue({ data: [], nextCursor: null, hasNextPage: false });
  });

  it('lists the events of the token company, without a session', async () => {
    const res = await list.GET(new NextRequest('http://localhost/api/v1/events?eventType=asset.created'));

    expect(res.status).toBe(200);
    expect(mockListPaginated).toHaveBeenCalledWith(scope, expect.objectContaining({ eventType: 'asset.created' }));
  });

  it('lists the organisation for a token issued at organisation level', async () => {
    mockValidateApiToken.mockResolvedValue({ ...token, companyId: null });
    await list.GET(new NextRequest('http://localhost/api/v1/events'));

    expect(mockListPaginated).toHaveBeenCalledWith(
      { organizationId: 'org-1', companyId: null },
      expect.anything()
    );
  });

  it('refuses an invalid token', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    const res = await list.GET(new NextRequest('http://localhost/api/v1/events'));

    expect(res.status).toBe(401);
    expect(mockListPaginated).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/events/[id]', () => {
  const get = () =>
    one.GET(new NextRequest('http://localhost/api/v1/events/e-1'), { params: Promise.resolve({ id: 'e-1' }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue(token);
  });

  it('looks the event up inside the token company', async () => {
    mockGetById.mockResolvedValue({ id: 'e-1' });
    const res = await get();

    expect(res.status).toBe(200);
    expect(mockGetById).toHaveBeenCalledWith(scope, 'e-1');
  });

  it('answers 404 for an event outside it', async () => {
    mockGetById.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });
});
