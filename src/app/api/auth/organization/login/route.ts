import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrganization } from '@/lib/auth/organization/jwt';
import { organizationAuthConfig } from '@/lib/auth/organization/config';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

// 5 intentos por IP cada 15 minutos — igual que antes, cuando este login
// vivía junto al de superadmin.
const checkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 5 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);

  if (!rl.allowed) {
    console.warn(`[organization/login] Rate limit hit — ip=${ip} retryAfter=${rl.retryAfter}s`);
    return NextResponse.json(
      { success: false, error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const result = await authenticateOrganization(email, password);

    if (!result.success) {
      console.warn(`[organization/login] Failed attempt — ip=${ip} email=${email}`);
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set(organizationAuthConfig.cookieName, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: organizationAuthConfig.sessionDuration,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[organization/login] Internal error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
