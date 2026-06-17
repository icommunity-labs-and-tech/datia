/**
 * Types for import job service
 */

export interface ImportJob {
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

export interface ImportFilters {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ExecuteResult {
  createdCount: number;
  rowCount: number;
}
