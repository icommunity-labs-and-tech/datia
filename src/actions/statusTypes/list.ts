'use server';

import { createStatusTypeServiceImpl } from '@/domain/status-types/StatusTypeServiceImpl';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';

export async function listStatusTypes() {
  const statusTypeService = createStatusTypeServiceImpl({ statusTypeRepository });
  return await statusTypeService.listStatusTypes();
}

