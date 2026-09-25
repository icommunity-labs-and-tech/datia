'use server';

import { prisma } from '@/lib/prisma';
import { requireOrganizationId, getCurrentTenant } from '@/lib/auth/tenant';
import { isDashboardRole } from '@/lib/auth/roles';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isValidHex(color: string | null): boolean {
  return color === null || HEX_RE.test(color);
}

export async function updateOrgBranding(data: {
  brandColorPrimary: string | null;
  brandColorSecondary: string | null;
}): Promise<{ error?: string }> {
  try {
    const tenant = await getCurrentTenant();
    const organizationId = await requireOrganizationId();

    if (!isDashboardRole(tenant.userRole)) {
      return { error: 'Solo los administradores pueden cambiar la identidad visual' };
    }

    if (!isValidHex(data.brandColorPrimary) || !isValidHex(data.brandColorSecondary)) {
      return { error: 'El color debe ser un valor hexadecimal válido (ej: #1a2b3c)' };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        brandColorPrimary: data.brandColorPrimary,
        brandColorSecondary: data.brandColorSecondary,
      },
    });

    return {};
  } catch (error) {
    console.error('Error updating org branding:', error);
    return { error: 'Error al guardar los colores' };
  }
}
