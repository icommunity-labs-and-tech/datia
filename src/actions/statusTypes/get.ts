'use server';

import { StatusTypeNotFoundError } from '@/domain/status-types/errors';
import { createStatusTypeServiceImpl } from '@/domain/status-types/StatusTypeServiceImpl';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';

export async function getStatusType(id: string) {
  try {
    const statusTypeService = createStatusTypeServiceImpl({ statusTypeRepository });
    return await statusTypeService.getStatusType(id);
  } catch (error) {
    if (error instanceof StatusTypeNotFoundError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

