'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationAccount } from './access';
import { inviteUser } from '@/actions/organizations/invite-user';
import type { CompanyError } from './create';

export interface InviteCompanyAccountInput {
  companyId: string;
  name: string;
  email: string;
  language?: 'es' | 'en';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invites an account into one company of the organization. */
export async function inviteCompanyAccount(
  input: InviteCompanyAccountInput
): Promise<{ success: boolean; error?: CompanyError; detail?: string }> {
  try {
    await requireOrganizationAccount();
  } catch {
    return { success: false, error: 'forbidden' };
  }

  if (!input.name?.trim() || !EMAIL.test(input.email?.trim() ?? '')) {
    return { success: false, error: 'email_invalid' };
  }

  const result = await inviteUser({
    companyId: input.companyId,
    name: input.name.trim(),
    email: input.email.trim(),
    role: 'ADMIN',
    language: input.language,
  });
  if (!result.success) return { success: false, error: 'invite_failed', detail: result.error };

  revalidatePath('/dashboard/companies');
  return { success: true };
}
