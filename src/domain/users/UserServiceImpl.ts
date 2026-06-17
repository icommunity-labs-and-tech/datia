import { UserService, type CreateUserRequest, type UpdateUserRequest, type ChangePasswordRequest, type UserResponse } from './UserService';
import { UserInputError, UserAlreadyExistsError, UserNotFoundError, AuthorizationError, InvalidCredentialsError, PasswordValidationError } from './errors';
import type { UserRepository } from './UserRepository';
import { DbError } from './UserRepository';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { verifyAdminAuth, verifyUserAuth, generateTemporaryPassword } from '@/actions/users/helpers';
import bcrypt from 'bcryptjs';

const toUserResponse = (u: any): UserResponse => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  phone: u.phone ?? null,
  notes: u.notes ?? null,
});

export function createUserServiceImpl(deps: {
  userRepository: UserRepository;
}): UserService {
  const { userRepository: userRepo } = deps;

  return {
    async createUser(data: CreateUserRequest): Promise<{ user: UserResponse; temporaryPassword: string }> {
      try {
        const organizationId = await requireOrganizationId();
        
        // auth
        await verifyAdminAuth();

        if (!data.email || !data.name) {
          throw new UserInputError(!data.email ? 'email' : 'name', 'Email y nombre son obligatorios');
        }

        // Check if email exists
        try {
          await userRepo.getByEmail(data.email);
          throw new UserAlreadyExistsError(data.email, 'Ya existe un usuario con este email');
        } catch (e) {
          if (e instanceof UserAlreadyExistsError) throw e;
          // User doesn't exist, continue
        }

        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const created = await userRepo.create({
          organizationId,
          email: data.email,
          name: data.name,
          role: data.role,
          phone: data.phone ?? null,
          notes: data.notes ?? null,
          passwordHash: hashedPassword,
        });

        return { user: toUserResponse(created), temporaryPassword };
      } catch (e) {
        if (e instanceof UserInputError || e instanceof UserAlreadyExistsError || e instanceof AuthorizationError) throw e;
        if (e instanceof DbError) throw new UserInputError('email', 'Error creando usuario');
        throw e;
      }
    },

    async updateUser(data: UpdateUserRequest): Promise<{ user: UserResponse }> {
      try {
        const organizationId = await requireOrganizationId();
        
        await verifyAdminAuth();

        if (!data.id) {
          throw new UserInputError('email', 'ID requerido');
        }

        if (data.email) {
          // Best-effort: check if another user has the same email
          try {
            const existing = await userRepo.getByEmail(data.email);
            if (existing.id !== data.id) {
              throw new UserAlreadyExistsError(data.email, 'Ya existe otro usuario con este email');
            }
          } catch (e) {
            if (e instanceof UserAlreadyExistsError) throw e;
            // User doesn't exist or other error, continue
          }
        }

        const updated = await userRepo.update(data.id, organizationId, {
          name: data.name ?? null,
          email: data.email ?? null,
          role: data.role ?? null,
          phone: data.phone ?? null,
          notes: data.notes ?? null,
        });

        return { user: toUserResponse(updated) };
      } catch (e) {
        if (e instanceof UserInputError || e instanceof UserAlreadyExistsError || e instanceof UserNotFoundError || e instanceof AuthorizationError) throw e;
        if (e instanceof DbError) throw new UserNotFoundError(data.id, 'Usuario no encontrado');
        throw e;
      }
    },

    async deleteUser(id: string): Promise<void> {
      try {
        const organizationId = await requireOrganizationId();
        
        await verifyAdminAuth();

        await userRepo.delete(id, organizationId);
      } catch (e) {
        if (e instanceof AuthorizationError) throw e;
        if (e instanceof DbError) throw new UserNotFoundError(id, 'Usuario no encontrado');
        throw e;
      }
    },

    async changePassword(data: ChangePasswordRequest): Promise<void> {
      try {
        const payload = await verifyUserAuth();

        if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
          throw new PasswordValidationError('Todos los campos son obligatorios');
        }
        if (data.newPassword !== data.confirmPassword) {
          throw new PasswordValidationError('Las contraseñas nuevas no coinciden');
        }
        if (data.newPassword.length < 6) {
          throw new PasswordValidationError('La nueva contraseña debe tener al menos 6 caracteres');
        }

        const passwordHash = await userRepo.getPasswordHash(payload.id);
        const isCurrent = await bcrypt.compare(data.currentPassword, passwordHash);
        if (!isCurrent) {
          throw new InvalidCredentialsError('La contraseña actual es incorrecta');
        }
        
        const isSame = await bcrypt.compare(data.newPassword, passwordHash);
        if (isSame) {
          throw new PasswordValidationError('La nueva contraseña debe ser diferente a la actual');
        }

        const hashed = await bcrypt.hash(data.newPassword, 10);
        const userOrgId = payload.organizationId ?? null;
        await userRepo.update(payload.id, userOrgId!, { passwordHash: hashed });
      } catch (e) {
        if (e instanceof InvalidCredentialsError || e instanceof PasswordValidationError || e instanceof UserNotFoundError) throw e;
        if (e instanceof DbError) throw new UserNotFoundError(data.userId, 'Usuario no encontrado');
        throw e;
      }
    },

  };
}
