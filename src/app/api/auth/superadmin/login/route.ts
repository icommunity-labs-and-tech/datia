import { NextRequest, NextResponse } from 'next/server';
import { authenticateSuperAdmin } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';

export async function POST(request: NextRequest) {
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
      return NextResponse.json(result, { status: 401 });
    }

    // Crear respuesta con cookie
    const response = NextResponse.json(result);
    
    response.cookies.set(superadminAuthConfig.cookieName, result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: superadminAuthConfig.sessionDuration,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Super Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





