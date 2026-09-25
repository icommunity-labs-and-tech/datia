'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireOrganizationAccount } from './access';
import { inviteAccount } from '@/actions/organizations/invite-account';

export interface CreateCompanyInput {
  name: string;
  /** Optional first account of the company, invited right away. */
  admin?: { name: string; email: string; language?: 'es' | 'en' };
}

export type CompanyError = 'name_required' | 'name_taken' | 'email_invalid' | 'invite_failed' | 'forbidden' | 'failed';

export interface CreateCompanyResult {
  success: boolean;
  company?: { id: string; name: string };
  /** The company exists but its first account could not be invited: retry from its row. */
  inviteError?: string;
  error?: CompanyError;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createCompany(input: CreateCompanyInput): Promise<CreateCompanyResult> {
  let actor: Awaited<ReturnType<typeof requireOrganizationAccount>>;
  try {
    actor = await requireOrganizationAccount();
  } catch {
    return { success: false, error: 'forbidden' };
  }
  const { organizationId } = actor;

  const name = input.name?.trim();
  if (!name) return { success: false, error: 'name_required' };

  const admin = input.admin && (input.admin.email?.trim() || input.admin.name?.trim()) ? input.admin : null;
  if (admin && (!admin.name?.trim() || !EMAIL.test(admin.email?.trim() ?? ''))) {
    return { success: false, error: 'email_invalid' };
  }

  try {
    const taken = await prisma.company.findFirst({ where: { organizationId, name }, select: { id: true } });
    if (taken) return { success: false, error: 'name_taken' };

    const company = await prisma.company.create({
      data: { organizationId, name },
      select: { id: true, name: true },
    });
    revalidatePath('/dashboard/companies');

    if (admin) {
      const invited = await inviteAccount(actor, {
        companyId: company.id,
        name: admin.name.trim(),
        email: admin.email.trim(),
        role: 'ADMIN',
        language: admin.language,
      });
      if (!invited.success) {
        return { success: true, company, inviteError: invited.error };
      }
    }

    return { success: true, company };
  } catch (error) {
    console.error('Error creating company:', error);
    // Two requests with the same name at once: the unique index answers the second.
    if ((error as { code?: string })?.code === 'P2002') return { success: false, error: 'name_taken' };
    return { success: false, error: 'failed' };
  }
}
