import { NextResponse } from 'next/server';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';

export async function GET() {
  try {
    const user = await getCurrentUserWithDetails();
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Importar prisma aquí para obtener datos completos
    const { prisma } = await import('@/lib/prisma');
    
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        signsWithCertificate: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userDetails) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(userDetails);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
