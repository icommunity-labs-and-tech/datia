'use server';

import { createApiTokenServiceImpl } from '@/domain/api-tokens/ApiTokenServiceImpl';
import { apiTokenRepository } from '@/infrastructure/prisma/repositories/ApiTokenRepositoryPrisma';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { prisma } from '@/lib/prisma';

export async function createApiToken(name: string, expiresAt?: Date | null) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

    if (!token) {
      throw new Error('No autenticado');
    }

    const payload = await verifyAdminJWT(token);
    if (!payload || payload.role !== 'ADMIN') {
      throw new Error('No autorizado');
    }

    // Get organization ID from user
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      throw new Error('Usuario no tiene organización asignada');
    }

    const request = {
      name: name.trim(),
      organizationId: user.organizationId,
      expiresAt: expiresAt || null,
    };

    const apiTokenService = createApiTokenServiceImpl({ apiTokenRepository });
    const result = await apiTokenService.createToken(request);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error creating API token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}


