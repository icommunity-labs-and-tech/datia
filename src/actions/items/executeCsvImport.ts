'use server';

import { parseCsv, type ParsedCsvRow } from '@/lib/csv';
import { requireOrganizationId } from '@/lib/auth/tenant';
import { prisma } from '@/lib/prisma';
import { InvalidCsvError } from '@/lib/import-job/errors';
import { createItemWithEvidence } from '@/domain/items/ItemCreationHelper';
import { itemRepository } from '@/infrastructure/prisma/repositories/ItemRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { createEvidenceServiceImpl } from '@/domain/evidence/EvidenceServiceImpl';
import { icommunityService } from '@/infrastructure/icommunity/ICommunityServiceImpl';
import { OrganizationNotVerifiedError } from '@/domain/items/errors';
import { revalidatePath } from 'next/cache';
import { MAX_CSV_FILE_SIZE, MAX_CSV_ROWS, formatFileSize, formatMaxFileSize } from './csvImportLimits';

export interface ExecuteCsvImportResult {
  success: boolean;
  createdCount?: number;
  errors?: string[];
}

export async function executeCsvImport(formData: FormData): Promise<ExecuteCsvImportResult> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        errors: ['No se ha enviado ningún archivo'],
      };
    }

    // Validar tamaño del archivo
    if (file.size > MAX_CSV_FILE_SIZE) {
      return {
        success: false,
        errors: [`El archivo es demasiado grande. Tamaño máximo: ${formatMaxFileSize()}, recibido: ${formatFileSize(file.size)}. Por favor, divide el archivo en lotes más pequeños.`],
      };
    }

    const text = await file.text();
    if (!text.trim()) {
      return {
        success: false,
        errors: ['El archivo CSV está vacío'],
      };
    }

    const parsedRows: ParsedCsvRow[] = parseCsv(text);
    
    if (parsedRows.length === 0) {
      return {
        success: false,
        errors: ['El CSV no contiene filas de datos'],
      };
    }

    // Validar número máximo de filas
    if (parsedRows.length > MAX_CSV_ROWS) {
      return {
        success: false,
        errors: [`El archivo contiene demasiadas filas. Máximo permitido: ${MAX_CSV_ROWS}, recibido: ${parsedRows.length}. Por favor, divide el archivo en lotes más pequeños.`],
      };
    }

    const organizationId = await requireOrganizationId();
    
    // Convertir a formato de filas de items
    const itemRows = parsedRows.map((row) => ({
      line: row.line,
      id: row.values['id']?.trim() ?? '',
      name: row.values['name']?.trim() ?? '',
      description: row.values['description']?.trim() || null,
    }));

    // Re-validar antes de ejecutar (por seguridad)
    const validationErrors: string[] = [];
    
    // Validar columnas requeridas
    const headers = parsedRows.length > 0 ? Object.keys(parsedRows[0].values) : [];
    const requiredColumns = ['id', 'name'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      validationErrors.push(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
    }

    // Validar IDs únicos dentro del CSV
    const ids = itemRows.map((r) => r.id.trim());
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const line = itemRows[i].line;
      if (!id) {
        validationErrors.push(`Línea ${line}: id vacío`);
      } else if (seen.has(id)) {
        validationErrors.push(`Línea ${line}: id duplicado "${id}" en el propio CSV`);
      }
      seen.add(id);
    }

    // Validar campos requeridos
    for (const row of itemRows) {
      if (!row.name?.trim()) {
        validationErrors.push(`Línea ${row.line}: name vacío`);
      }
    }

    if (validationErrors.length > 0) {
      throw new InvalidCsvError(
        'Errores de validación en las filas del CSV',
        validationErrors
      );
    }

    const existingConflicts: string[] = [];

    // Verificar productos existentes
    for (const row of itemRows) {
      const existing = await prisma.item.findFirst({
        where: { id: row.id.trim(), organizationId },
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

    // Crear items usando el servicio (con evidencia)
    // Nota: No podemos usar transacción aquí porque la creación de evidencia requiere llamadas externas
    // El helper createItemWithEvidence maneja rollbacks automáticamente si falla la creación de evidencia
    const evidenceService = createEvidenceServiceImpl({ icommunityService });
    const createdItems: string[] = [];
    const errors: string[] = [];
    
    for (const row of itemRows) {
      try {
        await createItemWithEvidence(
          { itemRepository, userRepository, evidenceService },
          {
            organizationId,
            id: row.id.trim(),
            name: row.name.trim(),
            description: row.description || '',
            imageUrl: null, // No se importa imageUrl desde CSV
          }
        );
        
        createdItems.push(row.id.trim());
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Línea ${row.line}: Error al crear item "${row.id}": ${errorMessage}`);
        
        // Si es un error crítico (organización no verificada), detener la importación
        if (error instanceof OrganizationNotVerifiedError) {
          throw error;
        }
      }
    }
    
    // Revalidar cache después de la importación
    revalidatePath('/dashboard/items');
    
    const createdCount = createdItems.length;
    
    // Si hay errores pero se crearon algunos items, reportar ambos
    if (errors.length > 0 && createdCount > 0) {
      return {
        success: true,
        createdCount,
        errors: [`Se crearon ${createdCount} items, pero hubo ${errors.length} error(es):`, ...errors],
      };
    }
    
    // Si hay errores y no se creó ningún item, fallar
    if (errors.length > 0 && createdCount === 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      createdCount,
    };
  } catch (err: any) {
    console.error('Error en executeCsvImport:', err);
    
    if (err instanceof InvalidCsvError) {
      return {
        success: false,
        errors: err.details && err.details.length > 0 
          ? err.details 
          : [err.message],
      };
    }

    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Error interno al ejecutar importación'],
    };
  }
}
