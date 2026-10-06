import { AssetRepository } from './AssetRepository';
import { UserRepository } from '../users/UserRepository';
import { EvidenceService } from '../evidence/EvidenceService';
import { AssetCreationRollbackError, AssetInputError, CompanyNotVerifiedError } from './errors';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';
import { companyFor } from '@/lib/company';
import { companyKycStatus } from '@/lib/kyc/company-status';
import type { Scope } from '@/lib/scope';

export interface CreateItemWithEvidenceInput {
  /** Always passed in: never read from ambient request state (#30). */
  scope: Scope;
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  /** Omitted: the signed-in user. `null`: no creator (API calls). */
  createdByUserId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateItemWithEvidenceResult {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  evidenceId: string;
}

/**
 * Helper function to create an asset with evidence.
 * This encapsulates creating an asset and creating evidence.
 * Can be used both for single asset creation and bulk imports.
 */
export async function createAssetWithEvidence(
  deps: {
    assetRepository: AssetRepository;
    userRepository: UserRepository;
    evidenceService: EvidenceService;
  },
  input: CreateItemWithEvidenceInput
): Promise<CreateItemWithEvidenceResult> {
  const { assetRepository: itemRepo, userRepository: userRepo, evidenceService: evidence } = deps;

  const { scope } = input;

  // Get current user if not provided
  let userId = input.createdByUserId;
  if (userId === undefined) {
    const currentUser = await getCurrentUserWithDetails();
    if (!currentUser?.id) {
      throw new AssetInputError('name', 'No se pudo obtener el usuario actual');
    }
    const user = await userRepo.getById(currentUser.id);
    userId = user.id;
  }

  // Validate the signature of the company the asset will land in — the same
  // one the write below resolves via companyFor, so what is checked here is
  // what actually signs it (#23).
  const companyId = await companyFor(scope);
  const signature = await companyKycStatus(companyId);

  if (!signature.signatureID) {
    throw new CompanyNotVerifiedError(
      companyId,
      'no_signature',
      'No se pudo certificar la evidencia: tu cuenta no tiene una firma verificada. Completa la verificación KYC.'
    );
  }

  if (!signature.verified) {
    throw new CompanyNotVerifiedError(
      companyId,
      'not_verified',
      'La firma de tu cuenta no está verificada. Completa el proceso KYC antes de crear activos.'
    );
  }

  const signatureID = signature.signatureID;

  // Create asset in DB
  let created;
  try {
    created = await itemRepo.create({
      id: input.id,
      scope,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      createdByUserId: userId,
    });
  } catch (e) {
    throw new AssetCreationRollbackError(
      input.id,
      'db_error',
      `Failed to create asset: ${e}`
    );
  }

  // Rollback function
  const rollback = async () => {
    try {
      await itemRepo.delete(created.id, scope);
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
  };

  try {


    // Create evidence
    let evidenceId: string;
    try {
      evidenceId = await evidence.createItemEvidence({
        signatureID,
        title: 'Creación de Asset',
        description: created.description || '',
        imageUrls: created.imageUrl ? [created.imageUrl] : [],
        metadata: {
          type: 'item_creation',
          assetId: created.id,
          name: created.name,
          createdAt: created.createdAt.toISOString(),
        },
      });

      // Update asset with evidenceId
      try {
        await itemRepo.updateEvidenceId(created.id, scope, evidenceId);
      } catch (error) {
        await rollback();
        throw new AssetCreationRollbackError(
          created.id,
          'db_error',
          `Failed to update asset with evidence: ${error}`
        );
      }
    } catch (e) {
      await rollback();
      if (e instanceof AssetCreationRollbackError) throw e;
      throw new AssetCreationRollbackError(
        created.id,
        'evidence_failed',
        `Evidence creation failed: ${e}`
      );
    }

    return {
      id: created.id,
      name: created.name,
      description: created.description || '',
      imageUrl: created.imageUrl,
      evidenceId,
    };
  } catch (e) {
    // If we get here, rollback was already called or asset creation failed
    throw e;
  }
}
