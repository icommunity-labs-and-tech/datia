import { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

export interface CreateStateInput {
  title: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls?: string[] | null;
  evidenceID?: string | null;
  createdByUserId: string;
  templateConfig?: Record<string, any> | null;
}

export interface StateRecord {
  id: string;
  title: string;
  description: string;
  statusTypeId: string;
  itemId: string;
  imageUrls: string[] | null;
  evidenceID: string | null;
  createdAt: Date;
  updatedAt: Date;
  backed?: boolean | null;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface StateRepository {
  getById(id: string, organizationId: string): Promise<StateRecord | null>;
  create(input: CreateStateInput): Promise<StateRecord>;
  updateEvidenceId(id: string, organizationId: string, evidenceID: string): Promise<void>;
  delete(id: string, organizationId: string): Promise<void>;
  listByItem(itemId: string, organizationId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    imageUrls: string[] | null;
    templateConfig?: any;
    createdAt: Date;
    evidenceID: string | null;
    backed: boolean | null;
    statusType: { id: string; name: string; description: string | null };
  }>>;
  update(id: string, organizationId: string, data: Partial<{ itemId: string; statusTypeId: string; evidenceID: string | null; backed: boolean | null; description: string | null }>): Promise<{
    id: string;
    itemId: string;
    statusTypeId: string;
    evidenceID: string | null;
    backed: boolean | null;
    description: string | null;
    createdAt: Date;
  }>;
  // Dashboard-specific queries
  countTotalStates(organizationId: string): Promise<number>;
  countBackedStates(organizationId: string): Promise<number>;
  countStatesThisMonth(organizationId: string, startDate: Date): Promise<number>;
  getStatesByUserGrouped(organizationId: string, startDate: Date): Promise<Array<{
    createdByUserId: string | null;
    _count: { id: number };
  }>>;
  getBackedStatesByUserGrouped(organizationId: string, startDate: Date): Promise<Array<{
    createdByUserId: string | null;
    _count: { id: number };
  }>>;
  list(organizationId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    statusTypeId: string;
    itemId: string;
    createdAt: Date;
    evidenceID: string | null;
    backed: boolean | null;
  }>>;
  // Cursor-based pagination
  listPaginated(
    organizationId: string,
    params: CursorPaginationParams & { itemId?: string }
  ): Promise<CursorPaginationResult<{
    id: string;
    title: string;
    description: string;
    statusTypeId: string;
    itemId: string;
    createdAt: Date;
    evidenceID: string | null;
    backed: boolean | null;
  }>>;
  // Para SUPER_ADMIN
  findAll(): Promise<StateRecord[]>;
}
