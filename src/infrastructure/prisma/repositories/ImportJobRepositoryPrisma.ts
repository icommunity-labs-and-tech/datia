import {
  ImportJobRepository,
  type ImportJobRecord,
  type CreateImportJobInput,
  type UpdateImportJobInput,
  type ImportJobFilters,
  DbError,
} from '@/domain/import-jobs/ImportJobRepository';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const toDomain = (j: any): ImportJobRecord => {
  try {
    return {
      id: j.id,
      organizationId: j.organizationId,
      organizationName: j.Organization?.name || null,
      fileName: j.fileName,
      fileUrl: j.fileUrl,
      fileSize: j.fileSize,
      status: j.status,
      uploadedBy: j.uploadedBy,
      uploadedByName: j.UploadedByUser?.name || null,
      executedBy: j.executedBy,
      executedByName: j.ExecutedByUser?.name || null,
      rowCount: j.rowCount,
      createdCount: j.createdCount,
      errorDetails: j.errorDetails ? (Array.isArray(j.errorDetails) ? j.errorDetails : []) : null,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    };
  } catch (error) {
    console.error('Error in toDomain mapping:', error);
    console.error('Job data:', JSON.stringify(j, null, 2));
    throw error;
  }
};

export const importJobRepository: ImportJobRepository = {
  async create(input: CreateImportJobInput): Promise<ImportJobRecord> {
    try {
      if (!(prisma as any).importJob) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo importJob. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo importJob. Por favor, reinicia el servidor de desarrollo.'
        );
      }

      const job = await prisma.importJob.create({
        data: {
          id: randomUUID(),
          organizationId: input.organizationId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          uploadedBy: input.uploadedBy,
          rowCount: input.rowCount ?? null,
          status: 'PENDING',
        },
      });
      return toDomain(job);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async getById(id: string): Promise<ImportJobRecord | null> {
    try {
      if (!(prisma as any).importJob) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo importJob. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo importJob. Por favor, reinicia el servidor de desarrollo.'
        );
      }

      const job = await prisma.importJob.findUnique({
        where: { id },
        include: {
          Organization: true,
          UploadedByUser: true,
          ExecutedByUser: true,
        },
      });
      return job ? toDomain(job) : null;
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async update(id: string, input: UpdateImportJobInput): Promise<ImportJobRecord> {
    try {
      if (!(prisma as any).importJob) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo importJob. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo importJob. Por favor, reinicia el servidor de desarrollo.'
        );
      }

      const updateData: any = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.executedBy !== undefined) updateData.executedBy = input.executedBy;
      if (input.rowCount !== undefined) updateData.rowCount = input.rowCount;
      if (input.createdCount !== undefined) updateData.createdCount = input.createdCount;
      if (input.errorDetails !== undefined) updateData.errorDetails = input.errorDetails;
      if (input.startedAt !== undefined) updateData.startedAt = input.startedAt;
      if (input.completedAt !== undefined) updateData.completedAt = input.completedAt;
      
      const job = await prisma.importJob.update({
        where: { id },
        data: updateData,
        include: {
          Organization: true,
          UploadedByUser: true,
          ExecutedByUser: true,
        },
      });
      return toDomain(job);
    } catch (e: any) {
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },

  async list(filters: ImportJobFilters): Promise<ImportJobRecord[]> {
    try {
      if (!(prisma as any).importJob) {
        throw new DbError(
          { error: 'Prisma Client no tiene el modelo importJob. Reinicia el servidor de desarrollo.' },
          'Prisma Client no tiene el modelo importJob. Por favor, reinicia el servidor de desarrollo.'
        );
      }

      const where: any = {};
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      console.log('ImportJobRepository.list - filters:', filters, 'where:', where);
      const jobs = await prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          Organization: true,
          UploadedByUser: true,
          ExecutedByUser: true,
        },
      });
      console.log('ImportJobRepository.list - found jobs:', jobs.length, jobs);
      return jobs.map(toDomain);
    } catch (e: any) {
      console.error('ImportJobRepository.list - error:', e);
      console.error('ImportJobRepository.list - error details:', {
        message: e?.message,
        code: e?.code,
        meta: e?.meta,
        stack: e?.stack,
      });
      throw new DbError(e, e?.message || 'Error de base de datos');
    }
  },
};
