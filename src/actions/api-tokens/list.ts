'use server';

import { createApiTokenServiceImpl } from '@/domain/api-tokens/ApiTokenServiceImpl';
import { apiTokenRepository } from '@/infrastructure/prisma/repositories/ApiTokenRepositoryPrisma';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { requireScope } from '@/lib/auth/tenant';
import { isDashboardRole } from '@/lib/auth/roles';

export async function listApiTokens() {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

    if (!token) {
      throw new Error('No autenticado');
    }

    const payload = await verifyAdminJWT(token);
    if (!payload || !isDashboardRole(payload.role)) {
      throw new Error('No autorizado');
    }

    // Scope from the session: its organisation and, for a company account, its company
    const scope = await requireScope();

    const apiTokenService = createApiTokenServiceImpl({ apiTokenRepository });
    const tokens = await apiTokenService.listTokens(scope);

    return {
      success: true,
      data: tokens,
    };
  } catch (error: any) {
    console.error('Error listing API tokens:', error);
    const errorMessage = error?.message || error?.cause?.message || String(error);
    return {
      success: false,
      error: errorMessage || 'Error desconocido',
      data: [],
    };
  }
}


