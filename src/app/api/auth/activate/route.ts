import { NextRequest, NextResponse } from 'next/server';
import { activateAccount } from '@/actions/organizations/activate-account';
import { signAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { token, password, skipKycCheck } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Usar la acción de activación que incluye validación de KYC
    const result = await activateAccount({
      activationToken: token,
      password,
      skipKycCheck: skipKycCheck === true,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Obtener el usuario completo para crear el JWT
    const user = await prisma.user.findUnique({
      where: { id: result.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 400 }
      );
    }

    // Crear JWT para autenticación automática
    const jwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId!,
      context: 'admin' as const,
    };

    const jwtToken = await signAdminJWT(jwtPayload);

    // Crear respuesta con cookie de autenticación
    const response = NextResponse.json({
      success: true,
      message: 'Cuenta activada exitosamente',
      user: result.user,
    });

    // Establecer cookie de autenticación
    response.cookies.set(adminAuthConfig.cookieName, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: adminAuthConfig.sameSite,
      path: adminAuthConfig.cookiePath,
      maxAge: adminAuthConfig.sessionDuration,
    });

    return response;
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





