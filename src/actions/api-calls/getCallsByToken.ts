'use server';

import { apiCallRepository } from '@/infrastructure/prisma/repositories/ApiCallRepositoryPrisma';
import { cookies } from 'next/headers';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import { requireScope } from '@/lib/auth/tenant';
import { isDashboardRole } from '@/lib/auth/roles';

export interface GetCallsByTokenParams {
  apiTokenId: string;
  startDate: Date;
  endDate: Date;
}

export async function getCallsByToken(params: GetCallsByTokenParams) {
  try {
    console.log('🔍 getCallsByToken - Parámetros:', {
      apiTokenId: params.apiTokenId.substring(0, 8) + '...',
      startDate: params.startDate.toISOString().split('T')[0],
      endDate: params.endDate.toISOString().split('T')[0]
    });

    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(adminAuthConfig.cookieName)?.value;

    if (!token) {
      console.error('❌ getCallsByToken - No hay token de autenticación');
      throw new Error('No autenticado');
    }

    const payload = await verifyAdminJWT(token);
    if (!payload || !isDashboardRole(payload.role)) {
      console.error('❌ getCallsByToken - Usuario no autorizado, role:', payload?.role);
      throw new Error('No autorizado');
    }

    // Scope from the session: its organisation and, for a company account, its company
    const scope = await requireScope();

    console.log('✅ getCallsByToken - OrganizationId:', scope.organizationId);

    const calls = await apiCallRepository.getCallsByTokenAndPeriod(
      params.apiTokenId,
      scope,
      params.startDate,
      params.endDate
    );
    
    console.log(`✅ getCallsByToken - Llamadas encontradas: ${calls.length}`);
    return { success: true as const, data: calls };
  } catch (error) {
    console.error('❌ getCallsByToken - Error:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Error al obtener llamadas de API',
    };
  }
}

