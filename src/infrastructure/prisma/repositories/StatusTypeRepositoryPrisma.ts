import { StatusTypeRepository, type StatusTypeRecord, type CreateStatusTypeInput, type UpdateStatusTypeInput, DbError } from '@/domain/status-types/StatusTypeRepository';
import { prisma } from '@/lib/prisma';
import { StatusTypeAlreadyExistsError, StatusTypeInputError, StatusTypeNotFoundError } from '@/domain/status-types/errors';
import crypto from 'crypto';

const toDomain = (s: any): StatusTypeRecord => ({
  id: s.id,
  name: s.name,
  description: s.description,
  template: s.template ?? [],
  organizationId: s.organizationId,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export const statusTypeRepository: StatusTypeRepository = {
  async getById(id: string, organizationId: string): Promise<StatusTypeRecord> {
    try {
      const statusType = await prisma.statusType.findFirst({ 
        where: { 
          id,
          organizationId
        }
      });
      if (!statusType) {
        throw new StatusTypeNotFoundError(id, 'Tipo de estado no encontrado');
      }
      return toDomain(statusType);
    } catch (e) {
      if (e instanceof StatusTypeNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async findDuplicateInOrganization(name: string, organizationId: string, excludeId?: string): Promise<boolean> {
    try {
      const duplicate = await prisma.statusType.findFirst({ 
        where: { 
          name, 
          organizationId,
          ...(excludeId ? { id: { not: excludeId } } : {}) 
        } 
      });
      return !!duplicate;
    } catch (e) {
      throw new DbError(e);
    }
  },

  async findByOrganization(organizationId: string): Promise<StatusTypeRecord[]> {
    try {
      const rows = await prisma.statusType.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(input: CreateStatusTypeInput): Promise<StatusTypeRecord> {
    try {
      const dup = await prisma.statusType.findFirst({ where: { name: input.name.trim(), organizationId: input.organizationId } });
      if (dup) {
        throw new StatusTypeAlreadyExistsError(input.name, input.organizationId, 'Nombre duplicado en esta organización');
      }

      const now = new Date();
      const created = await prisma.statusType.create({
        data: { 
          id: crypto.randomUUID(),
          name: input.name.trim(), 
          description: input.description.trim(), 
          template: input.template ?? [], 
          organizationId: input.organizationId,
          updatedAt: now,
        },
      });
      return toDomain(created);
    } catch (e) {
      if (e instanceof StatusTypeAlreadyExistsError) throw e;
      throw new StatusTypeInputError('name', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, organizationId: string, changes: UpdateStatusTypeInput): Promise<StatusTypeRecord> {
    try {
      // Verificar que el statusType pertenece a la organización
      const existing = await prisma.statusType.findFirst({ 
        where: { 
          id,
          organizationId
        }
      });
      if (!existing) {
        throw new StatusTypeNotFoundError(id, 'Tipo de estado no encontrado');
      }
      
      // Si se cambia el nombre, verificar que no haya duplicados
      if (changes.name !== undefined) {
        const dup = await prisma.statusType.findFirst({ 
          where: { 
            name: changes.name!.trim(), 
            organizationId,
            id: { not: id }
          } 
        });
        if (dup) {
          throw new StatusTypeAlreadyExistsError(changes.name!, organizationId, 'Nombre duplicado en esta organización');
        }
      }
      
      const updated = await prisma.statusType.update({
        where: { id },
        data: {
          ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
          ...(changes.description !== undefined ? { description: changes.description.trim() } : {}),
          ...(changes.template !== undefined ? { template: changes.template } : {}),
        },
      });
      return toDomain(updated);
    } catch (e) {
      if (e instanceof StatusTypeNotFoundError || e instanceof StatusTypeAlreadyExistsError) throw e;
      throw new StatusTypeNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que el statusType pertenece a la organización
      const existing = await prisma.statusType.findFirst({ 
        where: { 
          id,
          organizationId
        }
      });
      if (!existing) {
        throw new StatusTypeNotFoundError(id, 'Tipo de estado no encontrado');
      }
      
      await prisma.statusType.delete({ where: { id } });
    } catch (e) {
      if (e instanceof StatusTypeNotFoundError) throw e;
      throw new StatusTypeNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  async countStates(statusTypeId: string, organizationId: string): Promise<number> {
    try {
      // Verificar que el statusType pertenece a la organización
      const statusType = await prisma.statusType.findFirst({ 
        where: { 
          id: statusTypeId,
          organizationId
        }
      });
      if (!statusType) {
        return 0;
      }
      
      return await prisma.state.count({ where: { statusTypeId } });
    } catch (e) {
      throw new DbError(e);
    }
  },

  // Para SUPER_ADMIN
  async findAll(): Promise<StatusTypeRecord[]> {
    try {
      const rows = await prisma.statusType.findMany({
        include: {
          Organization: { select: { nombre: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
