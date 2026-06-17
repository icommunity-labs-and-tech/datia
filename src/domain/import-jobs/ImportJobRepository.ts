export interface ImportJobRecord {
  id: string;
  organizationId: string;
  organizationName: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  uploadedBy: string;
  uploadedByName: string | null;
  executedBy: string | null;
  executedByName: string | null;
  rowCount: number | null;
  createdCount: number | null;
  errorDetails: string[] | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImportJobInput {
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  rowCount?: number | null;
}

export interface UpdateImportJobInput {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  executedBy?: string | null;
  rowCount?: number | null;
  createdCount?: number | null;
  errorDetails?: string[] | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface ImportJobFilters {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class DbError extends Error {
  constructor(public readonly details: unknown, message = 'Database error') {
    super(message);
    this.name = 'DbError';
  }
}

export interface ImportJobRepository {
  create(input: CreateImportJobInput): Promise<ImportJobRecord>;
  getById(id: string): Promise<ImportJobRecord | null>;
  update(id: string, input: UpdateImportJobInput): Promise<ImportJobRecord>;
  list(filters: ImportJobFilters): Promise<ImportJobRecord[]>;
}

