import { UserService, type ChangePasswordRequest } from './UserService';
import { UserNotFoundError, AuthorizationError, InvalidCredentialsError, PasswordValidationError } from './errors';
import type { UserRepository } from './UserRepository';
import { DbError } from './UserRepository';
import { requireScope } from '@/lib/auth/tenant';
import { verifyAdminAuth, verifyUserAuth } from '@/actions/users/helpers';
import bcrypt from 'bcryptjs';

export function createUserServiceImpl(deps: {
  userRepository: UserRepository;
}): UserService {
  const { userRepository: userRepo } = deps;

  return {
    async deleteUser(id: string): Promise<void> {
      try {
        const scope = await requireScope();
        
        await verifyAdminAuth();

        await userRepo.delete(id, scope);
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
        const ownScope = payload.organizationId
          ? { organizationId: payload.organizationId, companyId: payload.companyId ?? null }
          : null;
        await userRepo.update(payload.id, ownScope, { passwordHash: hashed });
      } catch (e) {
        if (e instanceof InvalidCredentialsError || e instanceof PasswordValidationError || e instanceof UserNotFoundError) throw e;
        if (e instanceof DbError) throw new UserNotFoundError(data.userId, 'Usuario no encontrado');
        throw e;
      }
    },

  };
}
