import { NextRequest, NextResponse } from 'next/server';
import { verifyOperatorJWT } from '@/lib/auth/operator/jwt';
import { operatorAuthConfig } from '@/lib/auth/operator/config';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(operatorAuthConfig.cookieName)?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const jwtPayload = await verifyOperatorJWT(token);

  if (!jwtPayload) {
    const response = NextResponse.json({ user: null });
    response.cookies.delete(operatorAuthConfig.cookieName);
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
      response.cookies.delete(operatorAuthConfig.cookieName);
      return response;
    }

    // Verificar que sigue siendo operador (rol USER)
    if (user.role !== 'USER') {
      const response = NextResponse.json({ user: null });
      response.cookies.delete(operatorAuthConfig.cookieName);
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching operator user data:', error);
    return NextResponse.json({ user: null });
  }
}
