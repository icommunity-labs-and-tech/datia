import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { requireOrganizationId, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { requireSessionOrganization } from '@/lib/api/require-session';
import * as dashboardActions from '@/actions/dashboard';
import * as itemActions from '@/actions/items';
import * as userActions from '@/actions/users';
import * as kpis from '../dashboard/kpis/route';
import * as activity from '../dashboard/activity/route';
import * as item from '../items/[id]/route';
import * as itemSearch from '../items/search/route';
import * as user from '../users/[id]/route';

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireOrganizationId: vi.fn(async () => 'org-1') };
});

vi.mock('@/actions/dashboard', () => ({
  getDashboardKPIs: vi.fn(async () => ({})),
  getMonthlyActivity: vi.fn(async () => []),
}));
vi.mock('@/actions/items', () => ({
  getItem: vi.fn(async () => ({ id: 'i-1' })),
  searchItems: vi.fn(async () => [{ id: 'i-1' }]),
}));
vi.mock('@/actions/users', () => ({ getUserById: vi.fn(async () => ({ success: true, user: { id: 'u-1' } })) }));

const req = (url: string) => new NextRequest(`http://localhost${url}`);
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

const ROUTES = [
  { name: 'dashboard/kpis', call: () => (kpis as any).GET(), action: dashboardActions.getDashboardKPIs },
  { name: 'dashboard/activity', call: () => (activity as any).GET(req('/api/dashboard/activity?months=3')), action: dashboardActions.getMonthlyActivity },
  { name: 'items/[id]', call: () => (item as any).GET(req('/api/items/i-1'), withId('i-1')), action: itemActions.getItem },
  { name: 'items/search', call: () => (itemSearch as any).GET(req('/api/items/search?q=panel')), action: itemActions.searchItems },
  { name: 'users/[id]', call: () => (user as any).GET(req('/api/users/u-1'), withId('u-1')), action: userActions.getUserById },
];

describe('API routes that require a dashboard session', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(ROUTES)('$name answers 401 without a session and does not run the action', async ({ call, action }) => {
    (requireOrganizationId as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));

    const res = await call();

    expect(res.status).toBe(401);
    expect(action).not.toHaveBeenCalled();
  });

  it.each(ROUTES)('$name still answers for a signed-in user', async ({ call, action }) => {
    const res = await call();

    expect(res.status).toBe(200);
    expect(action).toHaveBeenCalled();
  });
});

describe('requireSessionOrganization', () => {
  it('returns the organisation of the session', async () => {
    await expect(requireSessionOrganization()).resolves.toBe('org-1');
  });

  it('lets errors other than a missing session through', async () => {
    (requireOrganizationId as any).mockRejectedValueOnce(new Error('database down'));
    await expect(requireSessionOrganization()).rejects.toThrow('database down');
  });
});
