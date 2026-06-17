'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import { requireOrganizationId, getCurrentTenant } from '@/lib/auth/tenant';

interface CreateSupportMessageParams {
  subject: string;
  message: string;
  page?: string;
}

export async function createSupportMessage(params: CreateSupportMessageParams) {
  const organizationId = await requireOrganizationId();
  const tenant = await getCurrentTenant();

  const record = await supportMessageRepository.create({
    organizationId,
    userId: tenant.userId,
    userName: null,
    subject: params.subject,
    message: params.message,
    page: params.page ?? null,
  });

  return { success: true, id: record.id };
}
