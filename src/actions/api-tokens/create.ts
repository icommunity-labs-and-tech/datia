'use server';

import { createApiTokenServiceImpl } from '@/domain/api-tokens/ApiTokenServiceImpl';
import { apiTokenRepository } from '@/infrastructure/prisma/repositories/ApiTokenRepositoryPrisma';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { requireScope } from '@/lib/auth/tenant';

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

    // Scope from the session: its organisation and, for a company account, its company
    const scope = await requireScope();

    const request = {
      name: name.trim(),
      organizationId: scope.organizationId,
      companyId: scope.companyId,
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


