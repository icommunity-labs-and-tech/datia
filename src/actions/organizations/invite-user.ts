"use server";

import { getCurrentTenant } from "@/lib/auth/tenant";
import { inviteAccount, type InviteUserInput, type InviteUserResult } from "./invite-account";

export type { InviteUserInput, InviteUserResult };

/**
 * Invita a un nuevo usuario a la organización desde el dashboard: la cuenta de
 * empresa invita a la suya.
 */
export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  try {
    return await inviteAccount(await getCurrentTenant(), input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al invitar usuario",
    };
  }
}
