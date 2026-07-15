import { ICommunityConfigError, ICommunityHTTPError } from '@/infrastructure/icommunity/errors';
import type { ICommunityService } from '@/infrastructure/icommunity/ICommunityService';
import type { UserRepository } from './UserRepository';
import { AuthorizationError, InvalidCredentialsError, PasswordValidationError, UserAlreadyExistsError, UserInputError, UserNotFoundError } from './errors';

export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'ADMIN';
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  role?: 'ADMIN';
  phone?: string | null;
  notes?: string | null;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
  phone?: string | null;
  notes?: string | null;
}

export interface UserService {
  createUser(
    data: CreateUserRequest
  ): Promise<{ user: UserResponse; temporaryPassword: string }>;

  updateUser(
    data: UpdateUserRequest
  ): Promise<{ user: UserResponse }>;

  deleteUser(
    id: string
  ): Promise<void>;

  changePassword(
    data: ChangePasswordRequest
  ): Promise<void>;
}
