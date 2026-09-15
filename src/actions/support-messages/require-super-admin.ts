import { isSuperAdmin } from '@/lib/auth/tenant';

/**
 * Support messages come from every organisation, so only a superadmin may read or
 * change them. A server action can be called by anyone who has its id, so the
 * check lives in the action and not only in the page that renders the panel (#31).
 */
export async function requireSuperAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) {
    throw new Error('Solo SUPER_ADMIN puede gestionar los mensajes de soporte');
  }
}
