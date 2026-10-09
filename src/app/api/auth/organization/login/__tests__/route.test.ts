import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/** Split out of the platform's own login (#20): this one only ever sets the organization cookie. */

const { mockAuthenticateOrganization } = vi.hoisted(() => ({ mockAuthenticateOrganization: vi.fn() }));

vi.mock('@/lib/auth/organization/jwt', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/organization/jwt')>('@/lib/auth/organization/jwt');
  return { ...actual, authenticateOrganization: mockAuthenticateOrganization };
});

import * as route from '../route';

const post = (ip: string, body: unknown) =>
  route.POST(
    new NextRequest('http://localhost/api/auth/organization/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    })
  );

describe('POST /api/auth/organization/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets the organization cookie on a successful login', async () => {
    mockAuthenticateOrganization.mockResolvedValue({
      success: true,
      user: { id: 'u-1', email: 'a@x.test', name: 'A', role: 'ORG_ADMIN' },
      token: 'tok',
    });

    const res = await post('1.1.1.1', { email: 'a@x.test', password: 'pw' });

    expect(res.status).toBe(200);
    expect(res.cookies.get('organization-auth-token')?.value).toBe('tok');
  });

  it('touches no cookie on a failed login', async () => {
    mockAuthenticateOrganization.mockResolvedValue({ success: false, error: 'Credenciales inválidas' });

    const res = await post('2.2.2.2', { email: 'b@x.test', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.cookies.get('organization-auth-token')).toBeUndefined();
  });

  it('rejects a request missing email or password before authenticating', async () => {
    const res = await post('3.3.3.3', { password: 'pw' });

    expect(res.status).toBe(400);
    expect(mockAuthenticateOrganization).not.toHaveBeenCalled();
  });
});
