import { prisma } from '@/lib/prisma';
import { notificationRepository } from '@/infrastructure/prisma/repositories/NotificationRepositoryPrisma';
import type { NotificationKind } from '@/domain/notifications/types';

interface NotificationContent {
  type: NotificationKind;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

/** Notifies one specific user — the audience is already known (#28). */
export async function notifyUser(
  userId: string,
  organizationId: string,
  content: NotificationContent
): Promise<void> {
  await notificationRepository.create({ userId, organizationId, ...content });
}

/**
 * Notifies whoever should hear about something that happened to a company
 * (#28): its own account if it has one, or — for what predates a company, or
 * an organisation-level webhook with no company — the organisation's own
 * accounts (ORG_ADMIN), so nothing is dropped silently.
 */
export async function notifyCompany(
  organizationId: string,
  companyId: string | null,
  content: NotificationContent
): Promise<void> {
  const users = await prisma.user.findMany({
    where: companyId ? { companyId } : { organizationId, companyId: null, role: 'ORG_ADMIN' },
    select: { id: true },
  });
  if (users.length === 0) return;

  await notificationRepository.createMany(
    users.map((user) => ({ userId: user.id, organizationId, ...content }))
  );
}
