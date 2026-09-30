import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * The assets endpoints used to authenticate with the API token and then read
 * the organisation from the dashboard session cookie via `requireScope()`: a
 * caller with only a token (the documented, intended way to use this API) got
 * a 500 on the list and a false 404 on the detail; one who also carried a
 * dashboard cookie for a DIFFERENT organisation got that cookie's assets, not
 * the token's. The same bug #78 already fixed for /api/v1/events — this file
 * and [id]/route.ts were never audited for it.
 *
 * `cookies()` is mocked to throw, so any code path that still reads a session
 * fails the test loudly instead of silently working "by accident" because no
 * cookie happened to be present.
 */

const { mockValidateApiToken, mockListPaginated, mockSearchPaginated, mockGetById, mockTrackApiCall } = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockListPaginated: vi.fn(),
  mockSearchPaginated: vi.fn(),
  mockGetById: vi.fn(),
  mockTrackApiCall: vi.fn(async () => undefined),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({ validateApiToken: mockValidateApiToken }));
vi.mock('@/lib/auth/api-tokens/trackApiCall', () => ({ trackApiCall: mockTrackApiCall }));
vi.mock('@/infrastructure/prisma/repositories/AssetRepositoryPrisma', () => ({
  assetRepository: { listPaginated: mockListPaginated, searchPaginated: mockSearchPaginated, getById: mockGetById },
}));
vi.mock('next/headers', () => ({
  cookies: async () => {
    throw new Error('the assets API must not read the session');
  },
}));

import * as list from '../route';
import * as one from '../[id]/route';

const token = { organizationId: 'org-1', companyId: 'co-1', tokenId: 't-1', isSandbox: false };
const scope = { organizationId: 'org-1', companyId: 'co-1' };
const emptyPage = { data: [], nextCursor: null, hasNextPage: false };

describe('GET /api/v1/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue(token);
    mockListPaginated.mockResolvedValue(emptyPage);
    mockSearchPaginated.mockResolvedValue(emptyPage);
  });

  it('lists the assets of the token company, without a session', async () => {
    const res = await list.GET(new NextRequest('http://localhost/api/v1/assets'));

    expect(res.status).toBe(200);
    expect(mockListPaginated).toHaveBeenCalledWith(scope, expect.anything());
  });

  it('searches within the token company, without a session', async () => {
    const res = await list.GET(new NextRequest('http://localhost/api/v1/assets?q=turbina'));

    expect(res.status).toBe(200);
    expect(mockSearchPaginated).toHaveBeenCalledWith('turbina', scope, expect.anything());
  });

  it('lists the organisation for a token issued at organisation level', async () => {
    mockValidateApiToken.mockResolvedValue({ ...token, companyId: null });
    await list.GET(new NextRequest('http://localhost/api/v1/assets'));

    expect(mockListPaginated).toHaveBeenCalledWith({ organizationId: 'org-1', companyId: null }, expect.anything());
  });

  it('refuses an invalid token', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    const res = await list.GET(new NextRequest('http://localhost/api/v1/assets'));

    expect(res.status).toBe(401);
    expect(mockListPaginated).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/assets/[id]', () => {
  const get = () =>
    one.GET(new NextRequest('http://localhost/api/v1/assets/a-1'), { params: Promise.resolve({ id: 'a-1' }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue(token);
  });

  it('looks the asset up inside the token company', async () => {
    mockGetById.mockResolvedValue({ id: 'a-1', name: 'Turbina' });
    const res = await get();

    expect(res.status).toBe(200);
    expect(mockGetById).toHaveBeenCalledWith('a-1', scope);
  });

  it('answers 404 for an asset outside it, not the cookie session’s', async () => {
    mockGetById.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });

  it('refuses an invalid token', async () => {
    mockValidateApiToken.mockResolvedValue(null);
    const res = await get();

    expect(res.status).toBe(401);
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
