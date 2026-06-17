'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function updateSigningPreference(userId: string, signsWithCertificate: boolean) {
  await verifyAdminAuth();

  const organizationId = await requireOrganizationId();
  const updated = await userRepository.update(userId, organizationId, { signsWithCertificate } as any);
  return { id: updated.id, email: updated.email, signsWithCertificate: updated.signsWithCertificate };
}
