import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export interface DeleteCompanyResult {
  success: boolean;
  error?: string;
}

/**
 * Borra una empresa y todo lo suyo.
 *
 * `Company → User.companyId` no es CASCADE sino SET NULL (comprobado contra
 * el esquema real de producción, no contra schema.prisma): dejar que Prisma
 * borre solo la empresa deja sus cuentas vivas y huérfanas, bloqueadas por
 * `requireScope()` pero no eliminadas. Por eso las cuentas se borran aquí a
 * mano, y antes sus filas en `Notification`/`ImportJob`, las únicas
 * relaciones de User con RESTRICT (`uploadedBy` de ImportJob ni admite null).
 * El resto de lo que cuelga de la empresa (Asset, ApiToken, ApiCall, Webhook,
 * EventLog, Certification) sí es CASCADE y lo gestiona la propia base.
 *
 * `organizationId`, si se pasa, acota el borrado a esa organización — lo usa
 * la cuenta de la organización sobre sus propias empresas; el superadmin no
 * lo pasa, porque el suyo es sobre cualquiera.
 */
export async function deleteCompanyCore(companyId: string, organizationId?: string): Promise<DeleteCompanyResult> {
  const company = await prisma.company.findFirst({
    where: organizationId ? { id: companyId, organizationId } : { id: companyId },
    select: { id: true, organizationId: true },
  });
  if (!company) {
    return { success: false, error: 'Empresa no encontrada' };
  }

  await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({ where: { companyId }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.importJob.deleteMany({ where: { OR: [{ uploadedBy: { in: userIds } }, { executedBy: { in: userIds } }] } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await tx.company.delete({ where: { id: companyId } });
  });

  revalidatePath('/organization/companies');
  revalidatePath(`/superadmin/organizations/${company.organizationId}`);
  revalidatePath(`/superadmin/organizations/${company.organizationId}/companies/${companyId}`);

  return { success: true };
}
