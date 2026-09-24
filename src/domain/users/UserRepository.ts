import type { Scope } from '@/lib/scope';
import { UserInputError, UserNotFoundError, UserAlreadyExistsError } from './errors';

export interface CreateUserInput {
  organizationId?: string | null; // NULL para SUPER_ADMIN
  /** Empresa de la cuenta; la de la organización por defecto si se omite. */
  companyId?: string | null;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateUserInput {
  name?: string | null;
  email?: string | null;
  role?: 'ADMIN' | null;
  phone?: string | null;
  notes?: string | null;
  passwordHash?: string | null;
}

export interface UserRecord {
  id: string;
  organizationId: string | null;
  companyId: string | null;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phone: string | null;
  notes: string | null;
  signsWithCertificate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface UserRepository {
  getById(id: string): Promise<UserRecord>;
  getByEmail(email: string): Promise<UserRecord>;
  getPasswordHash(id: string): Promise<string>;
  findByOrganization(scope: Scope): Promise<UserRecord[]>;
  create(input: CreateUserInput & { passwordHash?: string }): Promise<UserRecord>;
  update(id: string, scope: Scope | null, changes: UpdateUserInput): Promise<UserRecord>;
  delete(id: string, scope: Scope): Promise<void>;
  // Dashboard-specific queries
  countActiveUsers(scope: Scope, days: number): Promise<number>;
  countVerifiedUsers(scope: Scope): Promise<number>;
  countAdmins(scope: Scope): Promise<number>;
  countUsersByMonth(scope: Scope, startDate: Date, endDate: Date): Promise<number>;
  listUsersForDashboard(scope: Scope): Promise<Array<{ id: string; name: string | null }>>;
  // Para SUPER_ADMIN
  findAll(): Promise<UserRecord[]>;
}
