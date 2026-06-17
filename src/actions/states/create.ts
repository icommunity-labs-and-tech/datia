'use server';

import type { CreateStateRequest } from '@/domain/states/stateService';
import { createStateServiceImpl } from '@/domain/states/StateServiceImpl';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { StateInputError, StateAlreadyExistsError, OrganizationNotVerifiedError, StateCreationRollbackError } from '@/domain/states/errors';
import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from '@/domain/evidence/errors';
import { ICommunityConfigError, ICommunityHTTPError } from '@/infrastructure/icommunity/errors';
import { stateRepository } from '@/infrastructure/prisma/repositories/StateRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';
import { eventRepository } from '@/infrastructure/prisma/repositories/EventRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function createState(data: {
  itemId: string;
  statusTypeId: string;
  description?: string;
  imageUrls?: string[];
  createdByUserId?: string;
  templateConfig?: Record<string, any>;
}) {
  try {
    const request: CreateStateRequest = {
      name: data.description || '', // Will be used to generate title
      description: data.description || '',
      statusTypeId: data.statusTypeId,
      itemId: data.itemId,
      imageUrls: data.imageUrls || [],
      templateConfig: data.templateConfig || null,
      metadata: {
        type: 'state_creation',
        stateId: `state-${Date.now()}`, // Temporary ID for metadata
        createdAt: new Date().toISOString(),
      }
    };

    // Build services
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const stateService = createStateServiceImpl({
      stateRepository,
      userRepository,
      statusTypeRepository,
      evidenceService,
    });

    const result = await stateService.createState(request);

    // Emit event asynchronously (fire and forget)
    (async () => {
      try {
        const organizationId = await requireOrganizationId();
        await eventRepository.create(organizationId, {
          eventType: 'state.created',
          entityType: 'state',
          entityId: result.id,
          data: {
            id: result.id,
            itemId: result.itemId,
            statusTypeId: result.statusTypeId,
            title: result.name,
            description: result.description,
          },
        });
      } catch (err) {
        console.error('Error emitting state.created event:', err);
      }
    })();

    return {
      id: result.id,
      title: result.name,
      description: result.description,
      imageUrls: result.imageUrls,
      createdAt: new Date(),
      itemId: result.itemId,
      statusTypeId: result.statusTypeId,
      createdByUserId: data.createdByUserId,
      statusType: { id: result.statusTypeId, name: '', description: '' }, // Will be populated by DB
    };
  } catch (error) {
    // Map domain errors to user-friendly messages
    if (error instanceof StateInputError) {
      throw new Error(error.message);
    }
    if (error instanceof StateAlreadyExistsError) {
      throw new Error(error.message);
    }
    if (error instanceof OrganizationNotVerifiedError) {
      throw new Error(error.message);
    }
    if (error instanceof StateCreationRollbackError) {
      throw new Error(error.message);
    }
    if (error instanceof EvidenceInputError) {
      throw new Error(`Error de evidencia: ${error.message}`);
    }
    if (error instanceof ImageFetchError) {
      throw new Error(`Error al obtener imagen: ${error.message}`);
    }
    if (error instanceof ImageSizeExceededError) {
      throw new Error(`Tamaño de imagen excedido: ${error.message}`);
    }
    if (error instanceof EvidenceBuildError) {
      throw new Error(`Error al crear evidencia: ${error.message}`);
    }
    if (error instanceof ICommunityConfigError) {
      throw new Error(`Error de configuración: ${error.message}`);
    }
    if (error instanceof ICommunityHTTPError) {
      throw new Error(`Error de API: ${error.message}`);
    }
    
    // Convert unknown errors to standard Error for proper serialization
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(String(error.message));
    }
    
    // Re-throw unexpected errors as standard Error
    throw new Error(error instanceof Error ? error.message : 'Error desconocido al crear estado');
  }
}
