'use server';

import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth/tenant';

export interface PendingCertification {
  id: string;
  evidenceId: string;
  organizationName: string;
  companyName: string | null;
  recordCount: number;
  createdAt: Date;
}

/**
 * Certificaciones ya emitidas a iBS pero aún no confirmadas en cadena
 * (`Certification.status = 'ISSUED'`), de cualquier organización — el
 * superadmin es el único que ve a través de todas.
 *
 * `issueCertification`/`applyCertification` (src/lib/certification) son los
 * dos lados: emitir es síncrono (unos cientos de ms), confirmar depende de
 * que iBS llame a `evidence.certified` cuando la transacción aterriza. Lo que
 * aparece aquí es precisamente lo que sigue esperando ese segundo paso.
 */
export async function listPendingCertifications(): Promise<PendingCertification[]> {
  if (!(await isSuperAdmin())) return [];

  const rows = await prisma.certification.findMany({
    where: { status: 'ISSUED' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      evidenceId: true,
      createdAt: true,
      Organization: { select: { name: true } },
      Company: { select: { name: true } },
      _count: { select: { EmissionRecord: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    evidenceId: r.evidenceId,
    createdAt: r.createdAt,
    organizationName: r.Organization.name,
    companyName: r.Company?.name ?? null,
    recordCount: r._count.EmissionRecord,
  }));
}
