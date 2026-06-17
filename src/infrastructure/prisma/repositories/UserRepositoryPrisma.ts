import { UserRepository, type UserRecord, type CreateUserInput, type UpdateUserInput, DbError } from '@/domain/users/UserRepository';
import { prisma } from '@/lib/prisma';
import { UserAlreadyExistsError, UserInputError, UserNotFoundError } from '@/domain/users/errors';
import crypto from 'crypto';

const toDomain = (u: any): UserRecord => ({
  id: u.id,
  organizationId: u.organizationId ?? null,
  email: u.email,
  name: u.name ?? null,
  role: u.role,
  phone: u.phone ?? null,
  notes: u.notes ?? null,
  signsWithCertificate: !!u.signsWithCertificate,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export const userRepository: UserRepository = {
  async getById(id: string): Promise<UserRecord> {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new UserNotFoundError(id, 'Usuario no encontrado');
      }
      return toDomain(user);
    } catch (e) {
      if (e instanceof UserNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async getByEmail(email: string): Promise<UserRecord> {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UserNotFoundError(email, 'Usuario no encontrado');
      }
      return toDomain(user);
    } catch (e) {
      if (e instanceof UserNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async getPasswordHash(id: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({ where: { id }, select: { password: true } });
      if (!user || !user.password) {
        throw new UserNotFoundError(id, 'Usuario no encontrado');
      }
      return user.password;
    } catch (e) {
      if (e instanceof UserNotFoundError) throw e;
      throw new DbError(e);
    }
  },

  async findByOrganization(organizationId: string): Promise<UserRecord[]> {
    try {
      const rows = await prisma.user.findMany({ 
        where: { organizationId },
        orderBy: { createdAt: 'desc' } 
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async create(input: CreateUserInput & { passwordHash?: string }): Promise<UserRecord> {
    try {
      if (!input.email || !input.name || !input.role) {
        throw new UserInputError(!input.email ? 'email' : !input.name ? 'name' : 'role', 'Campos obligatorios');
      }
      
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) {
        throw new UserAlreadyExistsError(input.email, 'Ya existe un usuario con este email');
      }

      const now = new Date();
      const created = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          email: input.email,
          password: input.passwordHash ?? '',
          name: input.name,
          role: input.role,
          status: 'ACTIVE', // Si se crea con password, está activo
          phone: input.phone ?? null,
          notes: input.notes ?? null,
          signsWithCertificate: false,
          updatedAt: now,
        },
      });
      return toDomain(created);
    } catch (e) {
      if (e instanceof UserInputError || e instanceof UserAlreadyExistsError) throw e;
      throw new UserInputError('email', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, organizationId: string, changes: UpdateUserInput): Promise<UserRecord> {
    try {
      // Verificar que el usuario pertenece a la organización (excepto SUPER_ADMIN)
      const existing = await prisma.user.findFirst({ 
        where: { 
          id,
          OR: [
            { organizationId },
            { organizationId: null, role: 'SUPER_ADMIN' } // SUPER_ADMIN puede ser actualizado
          ]
        }
      });
      
      if (!existing) {
        throw new UserNotFoundError(id, 'Usuario no encontrado');
      }
      
      const data: any = {};
      if (changes.name !== undefined) data.name = changes.name;
      if (changes.email !== undefined && changes.email !== null) data.email = changes.email;
      if (changes.role !== undefined && changes.role !== null) data.role = changes.role;
      if (changes.phone !== undefined) data.phone = changes.phone;
      if (changes.notes !== undefined) data.notes = changes.notes;
      if (changes.passwordHash !== undefined && changes.passwordHash !== null) data.password = changes.passwordHash;
      
      const updated = await prisma.user.update({ where: { id }, data });
      return toDomain(updated);
    } catch (e) {
      if (e instanceof UserNotFoundError || e instanceof UserInputError) throw e;
      throw new UserNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      // Verificar que el usuario pertenece a la organización
      const existing = await prisma.user.findFirst({ 
        where: { 
          id,
          organizationId
        }
      });
      if (!existing) {
        throw new UserNotFoundError(id, 'Usuario no encontrado');
      }
      
      await prisma.user.delete({ where: { id } });
    } catch (e) {
      if (e instanceof UserNotFoundError) throw e;
      throw new UserNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  // Dashboard-specific queries
  async countActiveUsers(organizationId: string, days: number): Promise<number> {
    try {
      return await prisma.user.count({
        where: {
          organizationId,
          updatedAt: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countVerifiedUsers(organizationId: string): Promise<number> {
    // KYC is now at organization level, not user level
    // Return 0 as users are no longer individually verified
    return 0;
  },

  async countAdmins(organizationId: string): Promise<number> {
    try {
      return await prisma.user.count({ 
        where: { 
          organizationId,
          role: 'ADMIN' 
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countUsersByMonth(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await prisma.user.count({ 
        where: { 
          organizationId,
          createdAt: { gte: startDate, lt: endDate } 
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listUsersForDashboard(organizationId: string) {
    try {
      return await prisma.user.findMany({ 
        where: { organizationId },
        select: { id: true, name: true } 
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  // Para SUPER_ADMIN
  async findAll(): Promise<UserRecord[]> {
    try {
      const rows = await prisma.user.findMany({
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
