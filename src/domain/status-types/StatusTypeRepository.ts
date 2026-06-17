import { StatusTypeAlreadyExistsError, StatusTypeInputError, StatusTypeNotFoundError } from './errors';

export interface StatusTypeRecord {
  id: string;
  name: string;
  description: string;
  template: any[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStatusTypeInput {
  name: string;
  description: string;
  template?: any[];
  organizationId: string;
}

export interface UpdateStatusTypeInput {
  name?: string;
  description?: string;
  template?: any[];
}

export class DbError extends Error {
  constructor(public readonly cause?: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface StatusTypeRepository {
  getById(id: string, organizationId: string): Promise<StatusTypeRecord>;
  findDuplicateInOrganization(name: string, organizationId: string, excludeId?: string): Promise<boolean>;
  findByOrganization(organizationId: string): Promise<StatusTypeRecord[]>;
  create(input: CreateStatusTypeInput): Promise<StatusTypeRecord>;
  update(id: string, organizationId: string, changes: UpdateStatusTypeInput): Promise<StatusTypeRecord>;
  delete(id: string, organizationId: string): Promise<void>;
  countStates(statusTypeId: string, organizationId: string): Promise<number>;
  // Para SUPER_ADMIN
  findAll(): Promise<StatusTypeRecord[]>;
}
