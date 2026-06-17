import { StatusTypeInputError, StatusTypeAlreadyExistsError, StatusTypeNotFoundError, StatusTypeHasDependenciesError } from './errors';
import type { StatusTypeRepository } from './StatusTypeRepository';

export interface CreateStatusTypeRequest {
  name: string;
  description?: string;
  organizationId: string;
  template?: any;
}

export interface UpdateStatusTypeRequest {
  id: string;
  name?: string;
  description?: string;
  template?: any;
}

export interface StatusTypeResponse {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  template: any;
  createdAt: Date;
}

export interface StatusTypeService {
  createStatusType(data: CreateStatusTypeRequest): Promise<StatusTypeResponse>;
  updateStatusType(id: string, data: UpdateStatusTypeRequest): Promise<StatusTypeResponse>;
  deleteStatusType(id: string): Promise<void>;
  getStatusType(id: string): Promise<StatusTypeResponse>;
  listStatusTypes(): Promise<StatusTypeResponse[]>;
}
