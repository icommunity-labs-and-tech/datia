'use server';

import { revalidatePath } from 'next/cache';
import { createAssetServiceImpl } from '@/domain/assets/AssetServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { recordEvent } from '@/lib/services/events';
import {
  AssetInputError,
  AssetAlreadyExistsError,
  OrganizationNotVerifiedError,
  AssetCreationRollbackError,
} from '@/domain/assets/errors';

export interface CreateAssetInput {
  /** The id the organisation uses for the asset; it is what the QR points at. */
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateAssetResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Creates an asset from the dashboard.
 *
 * Assets could only be created through the API or a CSV import: the old form
 * hung off categories and their templates, and went with them (#37). The
 * evidence is signed by whoever creates it, unlike the API, where the token
 * belongs to the organisation and there is no person behind it.
 */
export async function createAsset(input: CreateAssetInput): Promise<CreateAssetResult> {
  try {
    const organizationId = await requireOrganizationId();

    const id = input.id.trim();
    const name = input.name.trim();
    if (!id) return { success: false, error: 'El ID es obligatorio.' };
    if (!name) return { success: false, error: 'El nombre es obligatorio.' };

    const service = createAssetServiceImpl({
      assetRepository,
      userRepository,
      evidenceService: createEvidenceServiceImpl({ icommunityService }),
    });

    const asset = await service.createItem(organizationId, {
      customId: id,
      name,
      description: input.description.trim(),
      imageUrl: input.imageUrl?.trim() || undefined,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });

    await recordEvent(organizationId, {
      eventType: 'item.created',
      entityType: 'Item',
      entityId: asset.id,
      data: { id: asset.id, name: asset.name },
    });

    revalidatePath('/dashboard/items');
    return { success: true, id: asset.id };
  } catch (error) {
    if (
      error instanceof AssetInputError ||
      error instanceof AssetAlreadyExistsError ||
      error instanceof OrganizationNotVerifiedError ||
      error instanceof AssetCreationRollbackError
    ) {
      return { success: false, error: error.message };
    }
    console.error('[createAsset]', error);
    return { success: false, error: 'No se pudo crear el activo.' };
  }
}
