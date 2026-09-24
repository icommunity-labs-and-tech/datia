'use server';

import { parseCsv, type ParsedCsvRow } from '@/lib/csv';
import { requireScope, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { scopeWhere } from '@/lib/scope';
import { prisma } from '@/lib/prisma';
import { MAX_CSV_FILE_SIZE, MAX_CSV_ROWS, formatFileSize, formatMaxFileSize } from './csvImportLimits';

export interface ValidationError {
  line: number;
  column?: string;
  type: 'missing_column' | 'invalid_type' | 'empty_required' | 'duplicate_id' | 'category_not_found' | 'id_exists' | 'invalid_url';
  message: string;
  value?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  summary?: {
    totalRows: number;
    validRows: number;
    errorCount: number;
  };
  preview?: {
    headers: string[];
    sampleRows: string[][];
  };
}

export interface ValidateCsvResult {
  success: boolean;
  result?: ValidationResult;
  error?: string;
}

export async function validateCsv(formData: FormData): Promise<ValidateCsvResult> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        error: 'No se ha enviado ningún archivo',
      };
    }

    // Validar tipo de archivo
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      return {
        success: false,
        error: 'El archivo debe ser un CSV',
      };
    }

    // Validar tamaño del archivo
    if (file.size > MAX_CSV_FILE_SIZE) {
      return {
        success: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${formatMaxFileSize()}, recibido: ${formatFileSize(file.size)}. Por favor, divide el archivo en lotes más pequeños.`,
      };
    }

    const text = await file.text();
    if (!text.trim()) {
      return {
        success: false,
        error: 'El archivo CSV está vacío',
      };
    }

    const parsedRows: ParsedCsvRow[] = parseCsv(text);
    
    if (parsedRows.length === 0) {
      return {
        success: false,
        error: 'El CSV no contiene filas de datos',
      };
    }

    // Validar número máximo de filas
    if (parsedRows.length > MAX_CSV_ROWS) {
      return {
        success: false,
        error: `El archivo contiene demasiadas filas. Máximo permitido: ${MAX_CSV_ROWS}, recibido: ${parsedRows.length}. Por favor, divide el archivo en lotes más pequeños.`,
      };
    }

    // Obtener headers de la primera fila parseada
    const headers = parsedRows.length > 0 ? Object.keys(parsedRows[0].values) : [];
    
    // Validar columnas requeridas
    const requiredColumns = ['id', 'name'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    const errors: ValidationError[] = [];
    
    // Error de columnas faltantes
    if (missingColumns.length > 0) {
      errors.push({
        line: 0,
        column: undefined,
        type: 'missing_column',
        message: `Columnas requeridas faltantes: ${missingColumns.join(', ')}`,
        value: undefined,
      });
    }

    // Si faltan columnas requeridas, no continuar con validación de filas
    if (missingColumns.length > 0) {
      // Mapeo de nombres de columnas en inglés a español
      const columnNameMap: Record<string, string> = {
        'id': 'ID',
        'name': 'Nombre',
        'description': 'Descripción',
      };
      
      // Filtrar y renombrar headers para el preview
      const previewHeaders = headers
        .filter(header => header !== 'imageUrl') // Eliminar imageUrl
        .map(header => columnNameMap[header] || header); // Renombrar a español
      
      // Mapeo inverso para obtener el header original desde el español
      const reverseColumnNameMap: Record<string, string> = {
        'ID': 'id',
        'Nombre': 'name',
        'Descripción': 'description',
      };
      
      return {
        success: true,
        result: {
          valid: false,
          errors,
          summary: {
            totalRows: parsedRows.length,
            validRows: 0,
            errorCount: errors.length,
          },
          preview: {
            headers: previewHeaders,
            sampleRows: parsedRows.slice(0, 10).map(row => {
              const previewRow: string[] = [];
              previewHeaders.forEach((previewHeader) => {
                const originalHeader = reverseColumnNameMap[previewHeader] || previewHeader;
                previewRow.push(row.values[originalHeader] ?? '');
              });
              return previewRow;
            }),
          },
        },
      };
    }

    const scope = await requireScope();
    
    // Convertir a formato de filas de activos
    const itemRows = parsedRows.map((row) => ({
      line: row.line,
      id: row.values['id']?.trim() ?? '',
      name: row.values['name']?.trim() ?? '',
      description: row.values['description']?.trim() || null,
    }));

    // Validar IDs únicos dentro del CSV
    const ids = itemRows.map((r) => r.id.trim());
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const line = itemRows[i].line;
      if (!id) {
        errors.push({
          line,
          column: 'id',
          type: 'empty_required',
          message: 'El campo id es requerido y no puede estar vacío',
          value: '',
        });
      } else if (seen.has(id)) {
        errors.push({
          line,
          column: 'id',
          type: 'duplicate_id',
          message: `ID duplicado "${id}" en el propio CSV`,
          value: id,
        });
      }
      seen.add(id);
    }

    // Validar campos requeridos
    for (const row of itemRows) {
      if (!row.name?.trim()) {
        errors.push({
          line: row.line,
          column: 'name',
          type: 'empty_required',
          message: 'El campo name es requerido y no puede estar vacío',
          value: row.name || '',
        });
      }
    }

    // Validar IDs no existentes en la base de datos (solo para filas válidas hasta ahora)
    const validRowsForIdCheck = itemRows.filter(row => 
      row.id?.trim() && 
      !errors.some(e => e.line === row.line && e.column === 'id')
    );
    
    const uniqueIds = Array.from(new Set(validRowsForIdCheck.map(r => r.id.trim())));
    
    for (const id of uniqueIds) {
      try {
        const existing = await prisma.asset.findFirst({
          where: { id, ...scopeWhere(scope) },
        });
        if (existing) {
          // Encontrar todas las líneas con este ID
          validRowsForIdCheck
            .filter(r => r.id.trim() === id)
            .forEach(row => {
              errors.push({
                line: row.line,
                column: 'id',
                type: 'id_exists',
                message: `El ID "${id}" ya existe en la base de datos`,
                value: id,
              });
            });
        }
      } catch {
        // Error al buscar asset
        validRowsForIdCheck
          .filter(r => r.id.trim() === id)
          .forEach(row => {
            errors.push({
              line: row.line,
              column: 'id',
              type: 'id_exists',
              message: `Error al verificar el ID "${id}"`,
              value: id,
            });
          });
      }
    }

    const validRows = itemRows.length - errors.length;
    const isValid = errors.length === 0;

    // Mapeo de nombres de columnas en inglés a español
    const columnNameMap: Record<string, string> = {
      'id': 'ID',
      'name': 'Nombre',
      'description': 'Descripción',
    };
    
    // Mapeo inverso para obtener el header original desde el español
    const reverseColumnNameMap: Record<string, string> = {
      'ID': 'id',
      'Nombre': 'name',
      'Descripción': 'description',
    };

    // Filtrar y renombrar headers para el preview
    const previewHeaders = headers
      .filter(header => header !== 'imageUrl') // Eliminar imageUrl
      .map(header => columnNameMap[header] || header); // Renombrar a español

    return {
      success: true,
      result: {
        valid: isValid,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalRows: itemRows.length,
          validRows: Math.max(0, validRows),
          errorCount: errors.length,
        },
        preview: {
          headers: previewHeaders,
          sampleRows: parsedRows.slice(0, 10).map(row => {
            const previewRow: string[] = [];
            previewHeaders.forEach((previewHeader) => {
              const originalHeader = reverseColumnNameMap[previewHeader] || previewHeader;
              previewRow.push(row.values[originalHeader] ?? '');
            });
            return previewRow;
          }),
        },
      },
    };
  } catch (err: any) {
    console.error('Error en validateCsv:', err);
    
    // Manejar error de autenticación/contexto específicamente
    if (err instanceof TenantContextNotFoundError) {
      return {
        success: false,
        error: err.message || 'No se pudo obtener el contexto de autenticación. Por favor, inicia sesión nuevamente.',
      };
    }
    
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error interno al validar CSV',
    };
  }
}
