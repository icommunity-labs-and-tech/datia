'use server';

import { StatusTypeHasDependenciesError, StatusTypeNotFoundError } from '@/domain/status-types/errors';
import { createStatusTypeServiceImpl } from '@/domain/status-types/StatusTypeServiceImpl';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';

export async function deleteStatusType(id: string) {
  try {
    const statusTypeService = createStatusTypeServiceImpl({ statusTypeRepository });
    await statusTypeService.deleteStatusType(id);
    return { success: true, message: 'Tipo de estado eliminado correctamente' };
  } catch (error) {
    if (error instanceof StatusTypeHasDependenciesError || error instanceof StatusTypeNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

