import { AssetRepository } from './AssetRepository';
import { UserRepository } from '../users/UserRepository';
import { EvidenceService } from '../evidence/EvidenceService';
import { AssetCreationRollbackError, AssetInputError, OrganizationNotVerifiedError } from './errors';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';
import { prisma } from '@/lib/prisma';

export interface CreateItemWithEvidenceInput {
  /** Always passed in: never read from ambient request state (#30). */
  organizationId: string;
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

  const { organizationId } = input;

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

  // Get organization and validate signature
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      signatureID: true,
      verificationStatus: true,
    },
  });

  if (!organization) {
    throw new AssetInputError('name', 'Organización no encontrada');
  }

  if (!organization.signatureID) {
    throw new OrganizationNotVerifiedError(
      organization.id,
      'no_signature',
      'No se pudo certificar la evidencia: tu organización no tiene una firma verificada. Completa el KYC de la organización.'
    );
  }

  if (organization.verificationStatus !== 'VERIFIED') {
    throw new OrganizationNotVerifiedError(
      organization.id,
      'not_verified',
      'La firma de tu organización no está verificada. Completa el proceso KYC de la organización antes de crear activos.'
    );
  }

  const signatureID = organization.signatureID;

  // Create asset in DB
  let created;
  try {
    created = await itemRepo.create({
      id: input.id,
      organizationId,
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
      await itemRepo.delete(created.id, organizationId);
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
        await itemRepo.updateEvidenceId(created.id, organizationId, evidenceId);
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
