'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import { listItemCertifications, type ItemCertification } from '@/lib/certification/queries';

/** The proofs anchored for one asset, newest first. */
export async function getItemCertifications(itemId: string): Promise<ItemCertification[]> {
  const organizationId = await requireOrganizationId();
  return listItemCertifications(organizationId, itemId);
}
