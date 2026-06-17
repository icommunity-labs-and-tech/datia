import { ItemRepository } from './ItemRepository';
import { UserRepository } from '../users/UserRepository';
import { EvidenceService } from '../evidence/EvidenceService';
import { ItemCreationRollbackError, ItemInputError, OrganizationNotVerifiedError } from './errors';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';
import { prisma } from '@/lib/prisma';

export interface CreateItemWithEvidenceInput {
  id: string;
  name: string;
  description: string;
  categoryIds?: string[];
  imageUrl?: string | null;
  templateFields?: Record<string, any> | null;
  itemTemplate?: any[];
  createdByUserId?: string; // Opcional, si no se proporciona se obtiene del contexto
}

export interface CreateItemWithEvidenceResult {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  evidenceID: string;
}

/**
 * Helper function to create an item with evidence.
 * This encapsulates the logic of creating an item, adding categories, and creating evidence.
 * Can be used both for single item creation and bulk imports.
 */
export async function createItemWithEvidence(
  deps: {
    itemRepository: ItemRepository;
    userRepository: UserRepository;
    evidenceService: EvidenceService;
  },
  input: CreateItemWithEvidenceInput
): Promise<CreateItemWithEvidenceResult> {
  const { itemRepository: itemRepo, userRepository: userRepo, evidenceService: evidence } = deps;

  // Get organizationId from context
  const organizationId = await requireOrganizationId();

  // Get current user if not provided
  let userId = input.createdByUserId;
  if (!userId) {
    const currentUser = await getCurrentUserWithDetails();
    if (!currentUser?.id) {
      throw new ItemInputError('name', 'No se pudo obtener el usuario actual');
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
    throw new ItemInputError('name', 'Organización no encontrada');
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
      'La firma de tu organización no está verificada. Completa el proceso KYC de la organización antes de crear items.'
    );
  }

  const signatureID = organization.signatureID;

  // Create item in DB
  let created;
  try {
    created = await itemRepo.create({
      id: input.id,
      organizationId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      itemTemplate: input.itemTemplate ?? [],
      templateFields: input.templateFields ?? null,
      createdByUserId: userId,
      categoryIds: input.categoryIds, // Pass categoryIds for legacy categoryId field
    } as any);
  } catch (e) {
    throw new ItemCreationRollbackError(
      input.id,
      'db_error',
      `Failed to create item: ${e}`
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
    // Add categories to item (many-to-many relationship)
    if (input.categoryIds && input.categoryIds.length > 0) {
      try {
        await itemRepo.addCategoriesToItem(created.id, input.categoryIds, organizationId);
      } catch (e) {
        await rollback();
        throw new ItemCreationRollbackError(
          created.id,
          'db_error',
          `Failed to add categories to item: ${e}`
        );
      }
    }

    // Create evidence
    let evidenceID: string;
    try {
      evidenceID = await evidence.createItemEvidence({
        signatureID,
        title: 'Creación de Item',
        description: created.description || '',
        imageUrls: created.imageUrl ? [created.imageUrl] : [],
        metadata: {
          type: 'item_creation',
          itemId: created.id,
          categoryIds: input.categoryIds || [],
          name: created.name,
          createdAt: created.createdAt.toISOString(),
          templateFields: created.templateFields,
          itemTemplate: created.itemTemplate,
        },
      });

      // Update item with evidenceID
      try {
        await itemRepo.updateEvidenceId(created.id, organizationId, evidenceID);
      } catch (error) {
        await rollback();
        throw new ItemCreationRollbackError(
          created.id,
          'db_error',
          `Failed to update item with evidence: ${error}`
        );
      }
    } catch (e) {
      await rollback();
      if (e instanceof ItemCreationRollbackError) throw e;
      throw new ItemCreationRollbackError(
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
      evidenceID,
    };
  } catch (e) {
    // If we get here, rollback was already called or item creation failed
    throw e;
  }
}
