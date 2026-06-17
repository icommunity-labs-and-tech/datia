'use server';

import { StatusTypeInputError, StatusTypeAlreadyExistsError, StatusTypeNotFoundError } from '@/domain/status-types/errors';
import { createStatusTypeServiceImpl } from '@/domain/status-types/StatusTypeServiceImpl';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';

export async function updateStatusType(
  id: string,
  data: { name?: string; description?: string; template?: any }
) {
  try {
    const statusTypeService = createStatusTypeServiceImpl({ statusTypeRepository });
    const updated = await statusTypeService.updateStatusType(id, { id, ...data });
    return updated;
  } catch (error) {
    if (error instanceof StatusTypeInputError || error instanceof StatusTypeAlreadyExistsError || error instanceof StatusTypeNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

