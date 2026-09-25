import { NextRequest, NextResponse } from 'next/server';
import { authenticatePanel } from '@/lib/auth/panel-login';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

// 5 intentos por IP cada 15 minutos
const checkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 5 });

export async function POST(request: NextRequest) {
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

    const result = await authenticatePanel(email, password);

    if (!result.success) {
      console.warn(`[superadmin/login] Failed attempt — ip=${ip} email=${email}`);
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set(result.cookie!.name, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.cookie!.maxAge,
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
