'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';

export async function updateOrgModules(
  organizationId: string,
  modules: { passport?: boolean; energy?: boolean }
) {
  const user = await getCurrentUserWithDetails();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { configuracion: true },
  });

  if (!org) return { success: false, error: 'Organization not found' };

  const current = (org.configuracion && typeof org.configuracion === 'object')
    ? org.configuracion as Record<string, unknown>
    : {};

  const currentModules = (current.modules && typeof current.modules === 'object')
    ? current.modules as Record<string, unknown>
    : {};

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      configuracion: {
        ...current,
        modules: { ...currentModules, ...modules },
      },
      updatedAt: new Date(),
    },
  });

  return { success: true };
}
