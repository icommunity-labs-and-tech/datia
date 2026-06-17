import type { ImportJob, ImportFilters, ExecuteResult } from '../import-job/types';
export type { ImportJob, ImportFilters, ExecuteResult } from '../import-job/types';
import {
  ImportJobError,
  ImportJobNotFoundError,
  InvalidCsvError,
  ImportJobInvalidStatusError,
} from '../import-job/errors';
import type { ImportJobRepository } from '@/domain/import-jobs/ImportJobRepository';
import type { StorageService } from './storage';
import { parseCsv, type ParsedCsvRow } from '@/lib/csv';
import { prisma } from '@/lib/prisma';
import type { Storage as GCSStorageType } from '@google-cloud/storage';

async function uploadToGCSWithRetry(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  maxRetries: number = 3
): Promise<void> {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) {
    throw new ImportJobError('GCS_BUCKET no está configurado');
  }

  const { Storage } = require('@google-cloud/storage') as {
    Storage: new () => GCSStorageType;
  };
  const storage = new Storage();
  const gcsBucket = storage.bucket(bucket);

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const blob = gcsBucket.file(fileName);
      await blob.save(buffer, {
        contentType,
        resumable: false,
        validation: 'crc32c',
      });
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = Math.pow(2, attempt) * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new ImportJobError('Error subiendo archivo a GCS', lastError);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}

export interface ImportJobService {
  uploadCsvFile(
    file: File,
    orgId: string,
    userId: string
  ): Promise<{ id: string; fileUrl: string }>;

  executeImport(
    importId: string,
    executorId: string
  ): Promise<ExecuteResult>;

  cancelImport(
    importId: string
  ): Promise<void>;

  getImportById(
    importId: string
  ): Promise<ImportJob>;

  listImports(
    filters: ImportFilters
  ): Promise<ImportJob[]>;

  getImportPreview(
    importId: string,
    maxLines?: number
  ): Promise<{ headers: string[]; rows: string[][] }>;
}

export function createImportJobService(deps: {
  importJobRepository: ImportJobRepository;
  storageService: StorageService;
}): ImportJobService {
  const { importJobRepository: importJobRepo, storageService } = deps;

  return {
    async uploadCsvFile(file: File, orgId: string, userId: string): Promise<{ id: string; fileUrl: string }> {
      try {
        // Validar que es CSV
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
          throw new InvalidCsvError(
            'El archivo debe ser un CSV',
            [`Tipo recibido: ${file.type || 'desconocido'}`]
          );
        }

        // Validar tamaño (máximo 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new InvalidCsvError(
            'El archivo es demasiado grande',
            [`Tamaño máximo: 50MB, recibido: ${(file.size / 1024 / 1024).toFixed(2)}MB`]
          );
        }

        // Leer el archivo
        let arrayBuffer: ArrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
        } catch (error) {
          throw new ImportJobError('Error leyendo el archivo', error);
        }

        const buffer = Buffer.from(arrayBuffer);
        const fileName = `imports/${Date.now()}_${file.name}`;
        
        // Parsear CSV para contar filas ANTES de subir
        const csvText = buffer.toString('utf-8');
        const parsed = parseCsv(csvText);
        const rowCount = parsed.length;
        
        // Subir a GCS con retry y timeout
        try {
          await withTimeout(
            uploadToGCSWithRetry(buffer, fileName, 'text/csv'),
            60000 // 60 segundos
          );
        } catch (error) {
          if (error instanceof Error && error.message === 'Timeout') {
            throw new ImportJobError('Timeout subiendo archivo a GCS', error);
          }
          throw error;
        }

        const bucket = process.env.GCS_BUCKET!;
        const fileUrl = `https://storage.googleapis.com/${bucket}/${fileName}`;

        // Crear registro ImportJob
        try {
          const importJob = await importJobRepo.create({
            organizationId: orgId,
            fileName: file.name,
            fileUrl: fileUrl,
            fileSize: file.size,
            uploadedBy: userId,
            rowCount,
          });

          return { id: importJob.id, fileUrl };
        } catch (error) {
          console.error('Error creando ImportJob:', error);
          throw new ImportJobError(
            `Error creando registro de importación: ${error instanceof Error ? error.message : String(error)}`,
            error
          );
        }
      } catch (error) {
        if (error instanceof InvalidCsvError || error instanceof ImportJobError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en uploadCsvFile', error);
      }
    },

    async executeImport(importId: string, executorId: string): Promise<ExecuteResult> {
      try {
        // Obtener el ImportJob
        let importJob;
        try {
          importJob = await importJobRepo.getById(importId);
        } catch (error) {
          throw new ImportJobError('Error obteniendo importación', error);
        }

        if (!importJob) {
          throw new ImportJobNotFoundError('Importación no encontrada', importId);
        }

        // Validar que esté en estado PENDING o FAILED
        if (importJob.status !== 'PENDING' && importJob.status !== 'FAILED') {
          throw new ImportJobInvalidStatusError(
            `No se puede ejecutar una importación con estado ${importJob.status}`,
            importJob.status,
            ['PENDING', 'FAILED']
          );
        }

        // Actualizar estado a PROCESSING
        try {
          await importJobRepo.update(importId, {
            status: 'PROCESSING',
            executedBy: executorId,
            startedAt: new Date(),
          });
        } catch (error) {
          throw new ImportJobError('Error actualizando estado de importación', error);
        }

        // Descargar CSV de GCS
        let fileData;
        try {
          fileData = await storageService.getFile(importJob.fileUrl);
        } catch (error) {
          // Si falla, actualizar a FAILED
          await importJobRepo.update(importId, {
            status: 'FAILED',
            errorDetails: ['Error descargando archivo CSV'],
            completedAt: new Date(),
          }).catch(() => {});
          throw new ImportJobError('Error descargando archivo CSV', error);
        }

        // Parsear CSV
        const csvText = fileData.buffer.toString('utf-8');
        const parsedRows: ParsedCsvRow[] = parseCsv(csvText);

        // Convertir a formato ParsedItemRow
        const itemRows = parsedRows.map((row) => ({
          line: row.line,
          id: row.values['id']?.trim() ?? '',
          name: row.values['name']?.trim() ?? '',
          description: row.values['description']?.trim() || null,
          categoryName: row.values['categoryName']?.trim() ?? '',
          imageUrl: (row.values['imageUrl'] ?? '').trim() || null,
        }));

        // Validar y crear productos en una transacción
        let importResult: { createdCount: number };
        try {
          // Validar todos los productos primero
          const errors: string[] = [];
          const ids = itemRows.map((r) => r.id.trim());
          const seen = new Set<string>();
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const line = itemRows[i].line;
            if (!id) {
              errors.push(`Línea ${line}: id vacío`);
            } else if (seen.has(id)) {
              errors.push(`Línea ${line}: id duplicado "${id}" en el propio CSV`);
            }
            seen.add(id);
          }

          for (const row of itemRows) {
            if (!row.name?.trim()) {
              errors.push(`Línea ${row.line}: name vacío`);
            }
            if (!row.categoryName?.trim()) {
              errors.push(`Línea ${row.line}: categoryName vacío`);
            }
          }

          if (errors.length > 0) {
            throw new InvalidCsvError(
              'Errores de validación en las filas del CSV',
              errors
            );
          }

          // Verificar categorías y productos existentes
          const categoryMap = new Map<string, string>();
          for (const row of itemRows) {
            const catName = row.categoryName.trim();
            if (!categoryMap.has(catName)) {
              const cat = await prisma.category.findFirst({
                where: { name: catName, organizationId: importJob.organizationId },
              });
              if (!cat) {
                throw new InvalidCsvError(
                  'Categoría no encontrada',
                  [`Línea ${row.line}: categoryName "${catName}" no existe`]
                );
              }
              categoryMap.set(catName, cat.id);
            }
          }

          // Verificar productos existentes
          const existingConflicts: string[] = [];
          for (const row of itemRows) {
            const existing = await prisma.item.findFirst({
              where: { id: row.id.trim(), organizationId: importJob.organizationId },
            });
            if (existing) {
              existingConflicts.push(`Línea ${row.line}: id "${row.id}" ya existe`);
            }
          }

          if (existingConflicts.length > 0) {
            throw new InvalidCsvError(
              'Se encontraron ids ya existentes',
              existingConflicts
            );
          }

          // Crear todos los productos en una transacción
          await prisma.$transaction(async (tx) => {
            const now = new Date();
            for (const row of itemRows) {
              const item = await tx.item.create({
                data: {
                  id: row.id.trim(),
                  organizationId: importJob.organizationId,
                  name: row.name.trim(),
                  description: row.description ?? null,
                  imageUrl: row.imageUrl ?? null,
                  updatedAt: now,
                  itemTemplate: [],
                },
              });
              
              // Añadir categoría usando ItemCategory (many-to-many)
              const categoryId = categoryMap.get(row.categoryName.trim());
              if (categoryId) {
                await tx.itemCategory.create({
                  data: {
                    itemId: item.id,
                    categoryId: categoryId,
                  },
                });
              }
            }
          });

          importResult = { createdCount: itemRows.length };
        } catch (error) {
          // Si falla, actualizar ImportJob a FAILED con detalles
          let errorDetails: string[] = [];
          
          if (error instanceof InvalidCsvError) {
            errorDetails = error.details || [error.message];
          } else {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            errorDetails = [errorMessage];
          }
          
          await importJobRepo.update(importId, {
            status: 'FAILED',
            errorDetails,
            completedAt: new Date(),
          }).catch(() => {});
          
          if (error instanceof InvalidCsvError) {
            throw error;
          }
          throw new ImportJobError(
            error instanceof Error ? error.message : 'Error desconocido',
            error
          );
        }

        // Si todo OK, actualizar a COMPLETED
        try {
          await importJobRepo.update(importId, {
            status: 'COMPLETED',
            createdCount: importResult.createdCount,
            completedAt: new Date(),
          });
        } catch (error) {
          throw new ImportJobError('Error actualizando estado final de importación', error);
        }

        return {
          createdCount: importResult.createdCount,
          rowCount: itemRows.length,
        };
      } catch (error) {
        if (error instanceof ImportJobError || 
            error instanceof ImportJobNotFoundError || 
            error instanceof ImportJobInvalidStatusError || 
            error instanceof InvalidCsvError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en executeImport', error);
      }
    },

    async cancelImport(importId: string): Promise<void> {
      try {
        let importJob;
        try {
          importJob = await importJobRepo.getById(importId);
        } catch (error) {
          throw new ImportJobError('Error obteniendo importación', error);
        }

        if (!importJob) {
          throw new ImportJobNotFoundError('Importación no encontrada', importId);
        }

        if (importJob.status !== 'PROCESSING' && importJob.status !== 'PENDING') {
          throw new ImportJobInvalidStatusError(
            `No se puede cancelar una importación con estado ${importJob.status}`,
            importJob.status,
            ['PROCESSING', 'PENDING']
          );
        }

        await importJobRepo.update(importId, {
          status: 'CANCELLED',
          completedAt: new Date(),
        });
      } catch (error) {
        if (error instanceof ImportJobError || 
            error instanceof ImportJobNotFoundError || 
            error instanceof ImportJobInvalidStatusError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en cancelImport', error);
      }
    },

    async getImportById(importId: string): Promise<ImportJob> {
      try {
        let importJob;
        try {
          importJob = await importJobRepo.getById(importId);
        } catch (error) {
          throw new ImportJobError('Error obteniendo importación', error);
        }

        if (!importJob) {
          throw new ImportJobNotFoundError('Importación no encontrada', importId);
        }

        return {
          id: importJob.id,
          organizationId: importJob.organizationId,
          organizationName: importJob.organizationName,
          fileName: importJob.fileName,
          fileUrl: importJob.fileUrl,
          fileSize: importJob.fileSize,
          status: importJob.status,
          uploadedBy: importJob.uploadedBy,
          uploadedByName: importJob.uploadedByName,
          executedBy: importJob.executedBy,
          executedByName: importJob.executedByName,
          rowCount: importJob.rowCount,
          createdCount: importJob.createdCount,
          errorDetails: importJob.errorDetails,
          startedAt: importJob.startedAt,
          completedAt: importJob.completedAt,
          createdAt: importJob.createdAt,
          updatedAt: importJob.updatedAt,
        } as ImportJob;
      } catch (error) {
        if (error instanceof ImportJobError || error instanceof ImportJobNotFoundError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en getImportById', error);
      }
    },

    async listImports(filters: ImportFilters): Promise<ImportJob[]> {
      try {
        let importJobs;
        try {
          importJobs = await importJobRepo.list(filters);
        } catch (error) {
          console.error('ImportJobService.listImports - error from repo:', error);
          throw new ImportJobError(
            `Error listando importaciones: ${error instanceof Error ? error.message : String(error)}`,
            error
          );
        }

        try {
          return importJobs.map((job) => ({
            id: job.id,
            organizationId: job.organizationId,
            organizationName: job.organizationName,
            fileName: job.fileName,
            fileUrl: job.fileUrl,
            fileSize: job.fileSize,
            status: job.status,
            uploadedBy: job.uploadedBy,
            uploadedByName: job.uploadedByName,
            executedBy: job.executedBy,
            executedByName: job.executedByName,
            rowCount: job.rowCount,
            createdCount: job.createdCount,
            errorDetails: job.errorDetails,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          })) as ImportJob[];
        } catch (mappingError) {
          console.error('ImportJobService.listImports - mapping error:', mappingError);
          throw new ImportJobError(
            `Error mapeando importaciones: ${mappingError instanceof Error ? mappingError.message : String(mappingError)}`,
            mappingError
          );
        }
      } catch (error) {
        if (error instanceof ImportJobError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en listImports', error);
      }
    },

    async getImportPreview(importId: string, maxLines = 20): Promise<{ headers: string[]; rows: string[][] }> {
      try {
        let importJob;
        try {
          importJob = await importJobRepo.getById(importId);
        } catch (error) {
          throw new ImportJobError('Error obteniendo importación', error);
        }

        if (!importJob) {
          throw new ImportJobNotFoundError('Importación no encontrada', importId);
        }

        // Descargar CSV
        let fileData;
        try {
          fileData = await storageService.getFile(importJob.fileUrl);
        } catch (error) {
          throw new ImportJobError('Error descargando archivo CSV', error);
        }

        // Parsear CSV
        const csvText = fileData.buffer.toString('utf-8');
        const parsedRows = parseCsv(csvText);

        if (parsedRows.length === 0) {
          return { headers: [], rows: [] };
        }

        // Obtener headers de la primera fila
        const headers = Object.keys(parsedRows[0].values);

        // Obtener primeras maxLines filas
        const rows = parsedRows.slice(0, maxLines).map((row) =>
          headers.map((header) => row.values[header] ?? '')
        );

        return { headers, rows };
      } catch (error) {
        if (error instanceof ImportJobError || error instanceof ImportJobNotFoundError) {
          throw error;
        }
        throw new ImportJobError('Error desconocido en getImportPreview', error);
      }
    },
  };
}
