import { UserInputError, UserNotFoundError, UserAlreadyExistsError } from './errors';

export interface CreateUserInput {
  organizationId?: string | null; // NULL para SUPER_ADMIN
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateUserInput {
  name?: string | null;
  email?: string | null;
  role?: 'USER' | 'ADMIN' | null;
  phone?: string | null;
  notes?: string | null;
  passwordHash?: string | null;
}

export interface UserRecord {
  id: string;
  organizationId: string | null;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
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
  findByOrganization(organizationId: string): Promise<UserRecord[]>;
  create(input: CreateUserInput & { passwordHash?: string }): Promise<UserRecord>;
  update(id: string, organizationId: string, changes: UpdateUserInput): Promise<UserRecord>;
  delete(id: string, organizationId: string): Promise<void>;
  // Dashboard-specific queries
  countActiveUsers(organizationId: string, days: number): Promise<number>;
  countVerifiedUsers(organizationId: string): Promise<number>;
  countAdmins(organizationId: string): Promise<number>;
  countUsersByMonth(organizationId: string, startDate: Date, endDate: Date): Promise<number>;
  listUsersForDashboard(organizationId: string): Promise<Array<{ id: string; name: string | null }>>;
  // Para SUPER_ADMIN
  findAll(): Promise<UserRecord[]>;
}
