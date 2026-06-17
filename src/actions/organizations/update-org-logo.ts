'use server';

import { prisma } from '@/lib/prisma';
import { requireOrganizationId, getCurrentTenant } from '@/lib/auth/tenant';
import { getStorage } from '@/lib/storage';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export async function updateOrgLogo(
  formData: FormData
): Promise<{ logoUrl?: string; error?: string }> {
  try {
    const tenant = await getCurrentTenant();
    const organizationId = await requireOrganizationId();

    if (tenant.userRole !== 'ADMIN') {
      return { error: 'Solo los administradores pueden cambiar el logo' };
    }

    const file = formData.get('logo') as File | null;
    if (!file || file.size === 0) {
      return { error: 'No se proporcionó ningún archivo' };
    }

    if (!file.type.startsWith('image/')) {
      return { error: 'El archivo debe ser una imagen' };
    }

    if (file.size > MAX_LOGO_BYTES) {
      return { error: 'El logo debe ser menor a 2 MB' };
    }

    const storage = getStorage();
    const saved = await storage.saveImage(file, 'org-logo' as any);

    await prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl: saved.url },
    });

    return { logoUrl: saved.url };
  } catch (error) {
    console.error('Error updating org logo:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { error: `Error al guardar el logo: ${message}` };
  }
}
