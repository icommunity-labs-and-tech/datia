'use server';

import { StatusTypeInputError, StatusTypeAlreadyExistsError } from '@/domain/status-types/errors';
import { createStatusTypeServiceImpl } from '@/domain/status-types/StatusTypeServiceImpl';
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';
import { requireOrganizationId } from '@/lib/auth/tenant';

export async function addStatusType(formData: Record<string, any>) {
  const { name, description, template } = formData as { 
    name: string; 
    description?: string; 
    template?: any;
  };

  try {
    const organizationId = await requireOrganizationId();
    const statusTypeService = createStatusTypeServiceImpl({ statusTypeRepository });
    const created = await statusTypeService.createStatusType({ name, description: description || '', organizationId, template });
    return created;
  } catch (error) {
    if (error instanceof StatusTypeInputError || error instanceof StatusTypeAlreadyExistsError) {
      throw new Error(error.message);
    }
    throw error as Error;
  }
}

