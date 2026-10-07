import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';
import { isDashboardRole } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(adminAuthConfig.cookieName)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const jwtPayload = await verifyAdminJWT(token);

  if (!jwtPayload) {
    const response = NextResponse.json({ user: null });
    response.cookies.delete(adminAuthConfig.cookieName);
    return response;
  }

  // Obtener datos completos del usuario desde la base de datos
  try {
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(adminAuthConfig.cookieName);
      return response;
    }

    // Verificar que sigue siendo admin
    if (!isDashboardRole(user.role)) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(adminAuthConfig.cookieName);
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching admin user data:', error);
    return NextResponse.json({ user: null });
  }
}
