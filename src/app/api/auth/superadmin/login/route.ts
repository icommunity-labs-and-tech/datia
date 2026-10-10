import { NextRequest, NextResponse } from 'next/server';
import { authenticateSuperAdmin } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

// 5 intentos por IP cada 15 minutos
const checkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 5 });

export async function POST(request: NextRequest) {
  // Production has no password login any more — IAP is the only way in (#20
  // follow-up). This refusal is defense in depth: the path already sits
  // behind IAP at the load balancer, so reaching this code in production
  // would mean that had somehow been bypassed.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'No disponible' }, { status: 404 });
  }

  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);

  if (!rl.allowed) {
    console.warn(`[superadmin/login] Rate limit hit — ip=${ip} retryAfter=${rl.retryAfter}s`);
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

    const result = await authenticateSuperAdmin(email, password);

    if (!result.success) {
      console.warn(`[superadmin/login] Failed attempt — ip=${ip} email=${email}`);
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set(superadminAuthConfig.cookieName, result.token!, {
      httpOnly: true,
      // This code path never runs in production any more (see the guard
      // above) — dev and e2e serve over plain HTTP, so `secure` would only
      // ever be false here regardless.
      secure: false,
      sameSite: 'strict',
      maxAge: superadminAuthConfig.sessionDuration,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[superadmin/login] Internal error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
