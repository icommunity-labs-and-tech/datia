'use server';

import { supportMessageRepository } from '@/infrastructure/prisma/repositories/SupportMessageRepositoryPrisma';
import { requireOrganizationId, getCurrentTenant, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';
import { SUPPORT_MESSAGE_LIMITS } from '@/domain/support-messages/types';

interface CreateSupportMessageParams {
  subject: string;
  message: string;
  page?: string;
}

export type CreateSupportMessageResult =
  | { success: true; id: string }
  | { success: false; error: 'unauthorized' | 'required' | 'tooLong' };

/**
 * How a dashboard user reaches support: the message lands in the superadmin panel
 * with the organisation, the author and the page they were on.
 */
export async function createSupportMessage(
  params: CreateSupportMessageParams
): Promise<CreateSupportMessageResult> {
  let organizationId: string;
  let userId: string;
  try {
    organizationId = await requireOrganizationId();
    ({ userId } = await getCurrentTenant());
  } catch (error) {
    if (error instanceof TenantContextNotFoundError) return { success: false, error: 'unauthorized' };
    throw error;
  }

  const subject = String(params?.subject ?? '').trim();
  const message = String(params?.message ?? '').trim();
  if (!subject || !message) return { success: false, error: 'required' };
  if (subject.length > SUPPORT_MESSAGE_LIMITS.subject || message.length > SUPPORT_MESSAGE_LIMITS.message) {
    return { success: false, error: 'tooLong' };
  }

  const user = await getCurrentUserWithDetails();
  const page = typeof params?.page === 'string' ? params.page.slice(0, SUPPORT_MESSAGE_LIMITS.page) : null;

  const record = await supportMessageRepository.create({
    organizationId,
    userId,
    userName: user?.name ?? null,
    subject,
    message,
    page,
  });

  return { success: true, id: record.id };
}
