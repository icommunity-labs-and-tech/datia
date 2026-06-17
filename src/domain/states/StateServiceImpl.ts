import { StateService, type CreateStateRequest, type StateResponse } from './stateService';
import { StateCreationRollbackError, StateInputError, StateAlreadyExistsError, OrganizationNotVerifiedError } from './errors';
import type { StateRepository } from './StateRepository';
import type { UserRepository } from '../users/UserRepository';
import type { StatusTypeRepository } from '../status-types/StatusTypeRepository';
import type { EvidenceService } from '../evidence/EvidenceService';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { getCurrentUserWithDetails } from '@/lib/auth/shared/session';
import { generateStateTitle } from './stateUtils';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export function createStateServiceImpl(deps: {
  stateRepository: StateRepository;
  userRepository: UserRepository;
  statusTypeRepository: StatusTypeRepository;
  evidenceService: EvidenceService;
}): StateService {
  const { stateRepository: stateRepo, userRepository: userRepo, statusTypeRepository: statusTypeRepo, evidenceService: evidence } = deps;

  return {
    async createState(data: CreateStateRequest): Promise<StateResponse> {
      try {
        // Get organizationId from context
        const organizationId = await requireOrganizationId();
        
        // 1. Get current user for createdByUserId
        const currentUser = await getCurrentUserWithDetails();
        
        if (!currentUser?.id) {
          throw new StateInputError('name', 'No se pudo obtener el usuario actual');
        }

        const user = await userRepo.getById(currentUser.id);
        const userId = user.id;

        // 2. Get organization and validate signature
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: {
            id: true,
            signatureID: true,
            verificationStatus: true,
          },
        });

        if (!organization) {
          throw new StateInputError('name', 'Organización no encontrada');
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
            'La firma de tu organización no está verificada. Completa el proceso KYC de la organización antes de crear estados.'
          );
        }

        const signatureID = organization.signatureID;

        // 3. Get statusType to generate title
        let statusType;
        try {
          statusType = await statusTypeRepo.getById(data.statusTypeId, organizationId);
        } catch (e) {
          throw new StateInputError(
            'statusTypeId',
            `Tipo de estado no encontrado: ${e}`
          );
        }

        // 4. Generate state title
        const stateTitle = generateStateTitle(data.name || '', statusType.name);

        // Ensure title is not empty
        if (!stateTitle || stateTitle.trim() === '') {
          throw new StateInputError(
            'statusTypeId',
            'No se pudo generar el título del estado. Verifica que el tipo de estado tenga un nombre válido.'
          );
        }

        // 5. Create state in DB (sin rollback automático, lo manejamos manualmente)
        let created;
        try {
          created = await stateRepo.create({
            title: stateTitle,
            description: data.description,
            statusTypeId: data.statusTypeId,
            itemId: data.itemId,
            imageUrls: data.imageUrls ?? [],
            evidenceID: 'pending',
            createdByUserId: userId,
            templateConfig: data.templateConfig ?? null,
          });
        } catch (e) {
          throw new StateCreationRollbackError(
            (data.metadata.stateId as string) || 'unknown',
            'db_error',
            `Failed to create state: ${e}`
          );
        }

        // Rollback function
        const rollback = async () => {
          try {
            await stateRepo.delete(created.id, organizationId);
          } catch (rollbackError) {
            console.error('Error during rollback:', rollbackError);
          }
        };

        try {
          // 6. Create evidence with rollback on failure
          let evidenceID: string;
          try {
            evidenceID = await evidence.createStateEvidence({
              signatureID,
              title: created.title,
              description: created.description,
              imageUrls: Array.isArray(created.imageUrls) ? created.imageUrls.filter((url): url is string => typeof url === 'string') : [],
              metadata: {
                type: 'state_creation',
                stateId: created.id,
                itemId: created.itemId,
                statusTypeId: created.statusTypeId,
                createdAt: created.createdAt.toISOString(),
                ...data.metadata,
              },
            });

            // Validate evidenceID
            if (!evidenceID || typeof evidenceID !== 'string' || evidenceID.trim() === '') {
              // Rollback: eliminar el state si el evidenceID es inválido
              await rollback();
              throw new StateCreationRollbackError(
                created.id,
                'evidence_failed',
                `Invalid evidenceID returned: ${evidenceID}`
              );
            }

            // Update state with evidenceID
            try {
              await stateRepo.updateEvidenceId(created.id, organizationId, evidenceID);
            } catch (e) {
              // Rollback: eliminar el state si falla la actualización
              await rollback();
              const errorMessage = e instanceof Error ? e.message : String(e);
              throw new StateCreationRollbackError(
                created.id,
                'db_error',
                `Failed to update state with evidence: ${errorMessage}`
              );
            }
          } catch (e) {
            await rollback();
            if (e instanceof StateCreationRollbackError) throw e;
            throw new StateCreationRollbackError(
              created.id,
              'evidence_failed',
              `Evidence creation failed: ${e}`
            );
          }

          // 7. Revalidate cache
          revalidatePath('/dashboard/states');
          revalidatePath(`/dashboard/items/${created.itemId}`);

          return {
            id: created.id,
            name: created.title,
            description: created.description,
            statusTypeId: created.statusTypeId,
            itemId: created.itemId,
            imageUrls: Array.isArray(created.imageUrls) ? created.imageUrls.filter((url): url is string => typeof url === 'string') : [],
          } satisfies StateResponse;
        } catch (e) {
          // If we get here, rollback was already called or state creation failed
          throw e;
        }
      } catch (error) {
        if (error instanceof StateInputError || 
            error instanceof StateAlreadyExistsError || 
            error instanceof OrganizationNotVerifiedError || 
            error instanceof StateCreationRollbackError) {
          throw error;
        }
        throw new StateCreationRollbackError(
          (data.metadata.stateId as string) || 'unknown',
          'evidence_failed',
          `Unexpected error: ${error}`
        );
      }
    },
  };
}
