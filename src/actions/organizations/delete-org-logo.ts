'use server';

import { prisma } from '@/lib/prisma';
import { requireOrganizationId, getCurrentTenant } from '@/lib/auth/tenant';
import { isDashboardRole } from '@/lib/auth/roles';

export async function deleteOrgLogo(): Promise<{ error?: string }> {
  try {
    const tenant = await getCurrentTenant();
    const organizationId = await requireOrganizationId();

    if (!isDashboardRole(tenant.userRole)) {
      return { error: 'Solo los administradores pueden cambiar el logo' };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl: null },
    });

    return {};
  } catch (error) {
    console.error('Error deleting org logo:', error);
    return { error: 'Error al eliminar el logo' };
  }
}
