import { StatusTypeService, type CreateStatusTypeRequest, type UpdateStatusTypeRequest, type StatusTypeResponse } from './StatusTypeService';
import { StatusTypeInputError, StatusTypeAlreadyExistsError, StatusTypeNotFoundError, StatusTypeHasDependenciesError } from './errors';
import { revalidatePath } from 'next/cache';
import { StatusTypeRepository, DbError } from './StatusTypeRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';

const toResponse = (s: any): StatusTypeResponse => ({
  id: s.id,
  name: s.name,
  description: s.description,
  organizationId: s.organizationId,
  template: s.template ?? [],
  createdAt: s.createdAt,
});

export function createStatusTypeServiceImpl(deps: {
  statusTypeRepository: StatusTypeRepository;
}): StatusTypeService {
  const { statusTypeRepository: repo } = deps;

  return {
    async createStatusType(data: CreateStatusTypeRequest): Promise<StatusTypeResponse> {
      try {
        const organizationId = data.organizationId || await requireOrganizationId();
        
        if (!data.name) {
          throw new StatusTypeInputError('name', 'El nombre es obligatorio');
        }

        const isDup = await repo.findDuplicateInOrganization(data.name.trim(), organizationId);
        if (isDup) {
          throw new StatusTypeAlreadyExistsError(data.name.trim(), organizationId, 'Nombre duplicado en esta organización');
        }

        const created = await repo.create({ 
          name: data.name.trim(), 
          description: (data.description || '').trim(), 
          template: data.template || [], 
          organizationId 
        });

        revalidatePath('/dashboard/status-types');
        return toResponse(created);
      } catch (e) {
        if (e instanceof StatusTypeInputError || e instanceof StatusTypeAlreadyExistsError) throw e;
        if (e instanceof DbError) {
          throw new StatusTypeInputError('name', e.message ?? 'Error DB');
        }
        throw e;
      }
    },

    async updateStatusType(id: string, data: UpdateStatusTypeRequest): Promise<StatusTypeResponse> {
      try {
        const organizationId = await requireOrganizationId();
        
        if (!id) {
          throw new StatusTypeInputError('id', 'ID requerido');
        }

        const updated = await repo.update(id, organizationId, {
          name: data.name?.trim(),
          description: data.description?.trim(),
          template: data.template,
        });

        revalidatePath('/dashboard/status-types');
        return toResponse(updated);
      } catch (e) {
        if (e instanceof StatusTypeInputError || e instanceof StatusTypeAlreadyExistsError || e instanceof StatusTypeNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new StatusTypeNotFoundError(id, e.message ?? 'Tipo de estado no encontrado');
        }
        throw e;
      }
    },

    async deleteStatusType(id: string): Promise<void> {
      try {
        const organizationId = await requireOrganizationId();
        
        let deps = 0;
        try {
          deps = await repo.countStates(id, organizationId);
        } catch {
          deps = 0;
        }
        
        if (deps > 0) {
          throw new StatusTypeHasDependenciesError(id, 'No se puede eliminar: tiene estados asociados');
        }
        
        await repo.delete(id, organizationId);

        revalidatePath('/dashboard/status-types');
      } catch (e) {
        if (e instanceof StatusTypeNotFoundError || e instanceof StatusTypeHasDependenciesError) throw e;
        if (e instanceof DbError) {
          throw new StatusTypeNotFoundError(id, e.message ?? 'Tipo de estado no encontrado');
        }
        throw e;
      }
    },

    async getStatusType(id: string): Promise<StatusTypeResponse> {
      try {
        const organizationId = await requireOrganizationId();
        
        const st = await repo.getById(id, organizationId);
        return toResponse(st);
      } catch (e) {
        if (e instanceof StatusTypeNotFoundError) throw e;
        if (e instanceof DbError) {
          throw new StatusTypeNotFoundError(id, e.message ?? 'Tipo de estado no encontrado');
        }
        throw e;
      }
    },

    async listStatusTypes(): Promise<StatusTypeResponse[]> {
      try {
        const organizationId = await requireOrganizationId();
        
        const list = await repo.findByOrganization(organizationId);
        return list.map(toResponse);
      } catch {
        return [];
      }
    },
  };
}
