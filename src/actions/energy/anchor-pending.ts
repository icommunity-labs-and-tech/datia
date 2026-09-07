'use server';

import { requireOrganizationId } from '@/lib/auth/tenant';
import {
  anchorPendingEmissions,
  confirmAnchoredEvidences,
  type AnchorSweepResult,
  type ConfirmSweepResult,
} from '@/lib/energy/anchor-service';

/**
 * Runs one anchoring sweep for the signed-in organisation.
 *
 * A thin wrapper: the work lives in `lib/energy/anchor-service` so a scheduler
 * or a route handler can drive the same sweep without going through React.
 */
export async function runAnchorSweep(limit?: number): Promise<AnchorSweepResult> {
  const organizationId = await requireOrganizationId();
  return anchorPendingEmissions(organizationId, { limit });
}

/** Pushes along whatever evidence is still waiting for the chain. */
export async function runConfirmSweep(limit?: number): Promise<ConfirmSweepResult> {
  const organizationId = await requireOrganizationId();
  return confirmAnchoredEvidences(organizationId, limit);
}
