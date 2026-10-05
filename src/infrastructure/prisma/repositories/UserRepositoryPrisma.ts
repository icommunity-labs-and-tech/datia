import { UserRepository, type UserRecord, type UpdateUserInput, DbError } from '@/domain/users/UserRepository';
import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';
import { UserNotFoundError } from '@/domain/users/errors';

const toDomain = (u: any): UserRecord => ({
  id: u.id,
  organizationId: u.organizationId ?? null,
  companyId: u.companyId ?? null,
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

  async findByOrganization(scope: Scope): Promise<UserRecord[]> {
    try {
      const rows = await prisma.user.findMany({ 
        where: scopeWhere(scope),
        orderBy: { createdAt: 'desc' } 
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },

  async update(id: string, scope: Scope | null, changes: UpdateUserInput): Promise<UserRecord> {
    try {
      // Verificar que el usuario está dentro del alcance. Un SUPER_ADMIN no
      // tiene organización: solo se le encuentra si se busca sin organización
      // (cambio de su propia contraseña), nunca desde la de otro.
      const existing = await prisma.user.findFirst({
        where: scope
          ? { id, ...scopeWhere(scope) }
          : { id, organizationId: null, role: 'SUPER_ADMIN' },
      });
      
      if (!existing) {
        throw new UserNotFoundError(id, 'Usuario no encontrado');
      }
      
      const data: any = {};
      if (changes.name !== undefined) data.name = changes.name;
      if (changes.email !== undefined && changes.email !== null) data.email = changes.email;
      // Only a company account can be given a role: the form that edits accounts
      // always sends ADMIN, and applying it to the organization's own account
      // would quietly demote it.
      if (changes.role !== undefined && changes.role !== null && existing.role === 'ADMIN') data.role = changes.role;
      if (changes.phone !== undefined) data.phone = changes.phone;
      if (changes.notes !== undefined) data.notes = changes.notes;
      if (changes.passwordHash !== undefined && changes.passwordHash !== null) data.password = changes.passwordHash;
      
      const updated = await prisma.user.update({ where: { id }, data });
      return toDomain(updated);
    } catch (e) {
      if (e instanceof UserNotFoundError) throw e;
      throw new UserNotFoundError(id, e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string, scope: Scope): Promise<void> {
    try {
      // Verificar que el usuario pertenece a la organización
      const existing = await prisma.user.findFirst({ 
        where: { id, ...scopeWhere(scope) }
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
  async countActiveUsers(scope: Scope, days: number): Promise<number> {
    try {
      return await prisma.user.count({
        where: {
          ...scopeWhere(scope),
          updatedAt: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countVerifiedUsers(scope: Scope): Promise<number> {
    // KYC is now at organization level, not user level
    // Return 0 as users are no longer individually verified
    return 0;
  },

  async countAdmins(scope: Scope): Promise<number> {
    try {
      return await prisma.user.count({ 
        where: { 
          ...scopeWhere(scope),
          role: 'ADMIN' 
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async countUsersByMonth(scope: Scope, startDate: Date, endDate: Date): Promise<number> {
    try {
      return await prisma.user.count({ 
        where: { 
          ...scopeWhere(scope),
          createdAt: { gte: startDate, lt: endDate } 
        }
      });
    } catch (e) {
      throw new DbError(e);
    }
  },

  async listUsersForDashboard(scope: Scope) {
    try {
      return await prisma.user.findMany({ 
        where: scopeWhere(scope),
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
          Organization: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return rows.map(toDomain);
    } catch (e) {
      throw new DbError(e);
    }
  },
};
