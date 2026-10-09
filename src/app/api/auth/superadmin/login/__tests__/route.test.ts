import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * This login used to also issue organization sessions, sharing the endpoint
 * with that panel (#20); now that each has its own, it only ever sets its
 * own cookie.
 */

const { mockAuthenticateSuperAdmin } = vi.hoisted(() => ({ mockAuthenticateSuperAdmin: vi.fn() }));

vi.mock('@/lib/auth/superadmin/jwt', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/superadmin/jwt')>('@/lib/auth/superadmin/jwt');
  return { ...actual, authenticateSuperAdmin: mockAuthenticateSuperAdmin };
});

import * as route from '../route';

const post = (ip: string, body: unknown) =>
  route.POST(
    new NextRequest('http://localhost/api/auth/superadmin/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    })
  );

describe('POST /api/auth/superadmin/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets the superadmin cookie on a successful login', async () => {
    mockAuthenticateSuperAdmin.mockResolvedValue({
      success: true,
      user: { id: 'u-1', email: 'a@x.test', name: 'A', role: 'SUPER_ADMIN' },
      token: 'tok',
    });

    const res = await post('1.1.1.1', { email: 'a@x.test', password: 'pw' });

    expect(res.status).toBe(200);
    expect(res.cookies.get('superadmin-auth-token')?.value).toBe('tok');
  });

  it('touches no cookie on a failed login', async () => {
    mockAuthenticateSuperAdmin.mockResolvedValue({ success: false, error: 'Credenciales inválidas' });

    const res = await post('2.2.2.2', { email: 'b@x.test', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.cookies.get('superadmin-auth-token')).toBeUndefined();
  });

  it('rejects a request missing email or password before authenticating', async () => {
    const res = await post('3.3.3.3', { email: 'c@x.test' });

    expect(res.status).toBe(400);
    expect(mockAuthenticateSuperAdmin).not.toHaveBeenCalled();
  });
});
