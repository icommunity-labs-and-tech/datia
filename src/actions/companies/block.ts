'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireOrganizationAccount } from './access';

export interface SetCompanyBlockedResult {
  success: boolean;
  error?: string;
}

/**
 * Bloquea o desbloquea una de las empresas propias de la organización (#138).
 *
 * Reutiliza `Company.active`: ya existía, pero era decorativo (solo pintaba
 * el badge «Activa/Inactiva»). Ahora también lo mira el login
 * (`authenticateUser`) y la activación de cuentas — bloquear corta accesos
 * nuevos sin tocar ningún dato. Una sesión ya abierta sigue válida hasta que
 * caduque su token (ver `middleware.ts`): esto no es una revocación
 * inmediata.
 */
export async function setCompanyBlocked(companyId: string, blocked: boolean): Promise<SetCompanyBlockedResult> {
  let actor: Awaited<ReturnType<typeof requireOrganizationAccount>>;
  try {
    actor = await requireOrganizationAccount();
  } catch {
    return { success: false, error: 'Solo la cuenta de la organización gestiona las empresas' };
  }

  const company = await prisma.company
    .update({
      where: { id: companyId, organizationId: actor.organizationId },
      data: { active: !blocked },
      select: { id: true },
    })
    .catch(() => null);
  if (!company) {
    return { success: false, error: 'Empresa no encontrada' };
  }

  revalidatePath('/organization/companies');
  return { success: true };
}
