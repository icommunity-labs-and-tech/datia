import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminJWT } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';

/** Who is signed in to the platform panel. */
export async function GET() {
  try {
    const token = (await cookies()).get(superadminAuthConfig.cookieName)?.value;
    if (!token) return NextResponse.json({ user: null });

    const payload = await verifySuperAdminJWT(token);
    if (!payload) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role },
    });
  } catch (error) {
    console.error('[superadmin/session] error:', error);
    return NextResponse.json({ user: null });
  }
}
