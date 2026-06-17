import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminJWT } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(superadminAuthConfig.cookieName)?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifySuperAdminJWT(token);

    if (!payload) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}





