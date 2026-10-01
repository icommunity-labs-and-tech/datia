import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * A browser that logged into one panel and then the other kept both cookies:
 * /session checks the platform one first, so a leftover superadmin cookie
 * silently shadowed a fresh, valid organization login — no error, just the
 * wrong panel's session winning. Each login now clears the other's cookie.
 */

const { mockAuthenticatePanel } = vi.hoisted(() => ({ mockAuthenticatePanel: vi.fn() }));

vi.mock('@/lib/auth/panel-login', () => ({ authenticatePanel: mockAuthenticatePanel }));

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

  it('clears a leftover organization cookie when a superadmin logs in', async () => {
    mockAuthenticatePanel.mockResolvedValue({
      success: true,
      kind: 'superadmin',
      user: { id: 'u-1' },
      token: 'tok',
      cookie: { name: 'superadmin-auth-token', maxAge: 3600 },
    });

    const res = await post('1.1.1.1', { email: 'a@x.test', password: 'pw' });

    expect(res.cookies.get('superadmin-auth-token')?.value).toBe('tok');
    // Deleted means set to empty — the cookie is still present in the
    // response, but with nothing left for a future request to send back.
    expect(res.cookies.get('organization-auth-token')?.value).toBeFalsy();
  });

  it('clears a leftover superadmin cookie when an organization account logs in', async () => {
    mockAuthenticatePanel.mockResolvedValue({
      success: true,
      kind: 'organization',
      user: { id: 'u-2' },
      token: 'tok2',
      cookie: { name: 'organization-auth-token', maxAge: 3600 },
    });

    const res = await post('2.2.2.2', { email: 'b@x.test', password: 'pw' });

    expect(res.cookies.get('organization-auth-token')?.value).toBe('tok2');
    expect(res.cookies.get('superadmin-auth-token')?.value).toBeFalsy();
  });

  it('touches no cookies on a failed login', async () => {
    mockAuthenticatePanel.mockResolvedValue({ success: false, error: 'Credenciales inválidas' });

    const res = await post('3.3.3.3', { email: 'c@x.test', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.cookies.get('superadmin-auth-token')).toBeUndefined();
    expect(res.cookies.get('organization-auth-token')).toBeUndefined();
  });
});
