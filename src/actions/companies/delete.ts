'use server';

import { requireOrganizationAccount } from './access';
import { deleteCompanyCore, type DeleteCompanyResult } from './delete-core';

/** Deletes one of the organization account's own companies (#138). */
export async function deleteCompany(companyId: string): Promise<DeleteCompanyResult> {
  let actor: Awaited<ReturnType<typeof requireOrganizationAccount>>;
  try {
    actor = await requireOrganizationAccount();
  } catch {
    return { success: false, error: 'Solo la cuenta de la organización gestiona las empresas' };
  }

  return deleteCompanyCore(companyId, actor.organizationId);
}
