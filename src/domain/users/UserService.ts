import { ICommunityConfigError, ICommunityHTTPError } from '@/infrastructure/icommunity/errors';
import type { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';
import type { UserRepository } from './UserRepository';
import { AuthorizationError, InvalidCredentialsError, PasswordValidationError, UserNotFoundError } from './errors';

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserService {
  deleteUser(
    id: string
  ): Promise<void>;

  changePassword(
    data: ChangePasswordRequest
  ): Promise<void>;
}
