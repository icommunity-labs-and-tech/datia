import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

// 10 intentos por IP cada 15 minutos (más permisivo que superadmin)
const checkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    // Accept JSON or FormData bodies
    let email: string | undefined;
    let password: string | undefined;
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        const body = await request.json();
        email = body?.email;
        password = body?.password;
      }
    } catch {}

    if (!email || !password) {
      try {
        const form = await request.formData();
        email = (form.get('email') as string) || email;
        password = (form.get('password') as string) || password;
      } catch {}
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const result = await authenticateAdmin(email, password);

    if (!result.success) {
      console.warn(`[admin/login] Failed attempt — ip=${ip} email=${email}`);
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      message: 'Login exitoso'
    });

    // Configurar cookie específica para admin
    response.cookies.set(adminAuthConfig.cookieName, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: adminAuthConfig.sameSite,
      maxAge: adminAuthConfig.sessionDuration,
      path: adminAuthConfig.cookiePath,
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
