'use client'

import Box from '@/components/Box';
import BoxHeader from '@/components/BoxHeader';
import { useState, useMemo } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import DownloadZipButton from '@/components/DownloadZipButton';
import { exportItemsCsvWithFields, exportItemQRCodes, exportItemsExcel } from '@/actions/exports';
import { validateCsv, type ValidationResult } from '@/actions/items/validateCsv';
import { executeCsvImport } from '@/actions/items/executeCsvImport';
import ItemSelectionModal from '@/components/ItemSelectionModal';
import FieldSelector, { type FieldKey } from '@/components/FieldSelector';
import { MAX_CSV_FILE_SIZE, MAX_CSV_ROWS, formatMaxFileSize } from '@/actions/items/csvImportLimits';
import { useTranslations } from 'next-intl';

export default function ExportItemsBox() {
  const t = useTranslations('exports');
  const tCommon = useTranslations('common.actions');
  const availableFields = useMemo(() => [
    { key: 'id' as FieldKey, label: t('fieldLabels.id') },
    { key: 'name' as FieldKey, label: t('fieldLabels.name') },
    { key: 'description' as FieldKey, label: t('fieldLabels.description') },
    { key: 'allCategories' as FieldKey, label: t('fieldLabels.allCategories') },
    { key: 'createdAt' as FieldKey, label: t('fieldLabels.createdAt') },
    { key: 'lastStateTitle' as FieldKey, label: t('fieldLabels.lastStateTitle') },
    { key: 'lastStateDate' as FieldKey, label: t('fieldLabels.lastStateDate') },
    { key: 'customerUrl' as FieldKey, label: t('fieldLabels.customerUrl') },
  ], [t]);
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(['id', 'name', 'allCategories', 'createdAt', 'customerUrl']);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    createdCount?: number;
    errors?: string[];
  } | null>(null);

  const toggleField = (key: FieldKey) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const getCsvFile = async (selectedItemIds: string[]) => {
    return exportItemsCsvWithFields(selectedFields, selectedItemIds);
  };

  const getQrZip = async (selectedItemIds: string[]) => {
    return exportItemQRCodes({ itemIds: selectedItemIds });
  };

  const getExcelFile = async (selectedItemIds: string[]) => {
    return exportItemsExcel({ itemIds: selectedItemIds });
  };

  return (
    <Box>
      <BoxHeader title={t('title')} icon="bi-filetype-csv" />

      <Form className="mb-3 px-1">
        <h6 className="mb-1">{t('exportToCsv')}</h6>
        <p className="text-muted small mb-2">
          {t('exportDescription', { 
            button: t('exportCsv'), 
            fields: '<code>id</code>, <code>name</code>, <code>description</code> y <code>categoryName</code>' 
          })}
        </p>
        <Button
          variant="outline-primary"
          className="d-flex align-items-center"
          onClick={() => setShowCsvModal(true)}
        >
          <i className="bi bi-filetype-csv me-2" />
          {t('exportCsv')}
        </Button>

        <hr className="my-4" />

        <h6 className="mb-1">{t('exportQrs')}</h6>
        <p className="text-muted small mb-2">
          {t('exportQrsDescription', { button: t('exportQrs') })}
        </p>
        <Button
          variant="outline-primary"
          className="d-flex align-items-center"
          onClick={() => setShowQrModal(true)}
        >
          <i className="bi bi-qr-code me-2" />
          {t('exportQrs')}
        </Button>

        <hr className="my-4" />

        <h6 className="mb-1">{t('importFromCsv')}</h6>
        <p className="text-muted small mb-2">
          {t('importDescription', { 
            button: t('importButton'), 
            fields: '<code>id</code>, <code>name</code>, <code>description</code> y <code>categoryName</code>' 
          })}
        </p>
        <Button
          variant="outline-secondary"
          className="d-flex align-items-center"
          onClick={() => setShowImportModal(true)}
        >
          <i className="bi bi-filetype-csv me-2" />
          {t('importButton')}
        </Button>
      </Form>

      <ItemSelectionModal
        show={showCsvModal}
        onHide={() => setShowCsvModal(false)}
        title={t('selectProductsAndFields')}
        previewFields={availableFields.filter(f => selectedFields.includes(f.key))}
        footer={(selectedItemIds) => (
          <>
            <Button variant="secondary" onClick={() => setShowCsvModal(false)}>
              {tCommon('cancel')}
            </Button>
            <DownloadZipButton
              label={t('exportCsv')}
              iconClassName="bi bi-filetype-csv me-2"
              variant="primary"
              getZip={() => getCsvFile(selectedItemIds)}
            />
          </>
        )}
      >
        <FieldSelector
          fields={availableFields}
          selected={selectedFields}
          onToggle={toggleField}
          idPrefix="csv-field"
        />
      </ItemSelectionModal>

      <ItemSelectionModal
        show={showQrModal}
        onHide={() => setShowQrModal(false)}
        title="Seleccionar productos para exportar QRs"
        footer={(selectedItemIds) => (
          <>
            <Button variant="secondary" onClick={() => setShowQrModal(false)}>
              Cancelar
            </Button>
            <DownloadZipButton
              label="Exportar como ZIP"
              iconClassName="bi bi-file-zip me-2"
              variant="primary"
              getZip={() => getQrZip(selectedItemIds)}
            />
            <DownloadZipButton
              label="Exportar como Excel"
              iconClassName="bi bi-file-earmark-spreadsheet me-2"
              variant="success"
              getZip={() => getExcelFile(selectedItemIds)}
            />
          </>
        )}
      />

      <Modal show={showImportModal} onHide={() => {
        setShowImportModal(false);
        setImportFile(null);
        setValidationResult(null);
        setExecutionResult(null);
      }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Importar productos desde CSV</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info mb-3">
            <h6 className="alert-heading">
              <i className="bi bi-info-circle me-2" />
              Límites de importación
            </h6>
            <ul className="mb-0 small">
              <li>Tamaño máximo del archivo: <strong>{formatMaxFileSize()}</strong></li>
              <li>Número máximo de filas: <strong>{MAX_CSV_ROWS}</strong></li>
              <li>Si tu archivo excede estos límites, divídelo en lotes más pequeños</li>
            </ul>
          </div>
          
          <p className="text-muted small mb-3">
            El CSV debe contener al menos las columnas: <code>id</code>, <code>name</code>,{' '}
            <code>description</code> y <code>categoryName</code>. El archivo se validará automáticamente al seleccionarlo.
          </p>
          
          <div className="mb-3">
            <Form.Label>Archivo CSV</Form.Label>
            <Form.Control
              type="file"
              accept=".csv,text/csv"
              disabled={isValidating || isExecuting}
              onChange={async (e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0] ?? null;
                setImportFile(file);
                setValidationResult(null);
                setExecutionResult(null);
                
                if (file) {
                  setIsValidating(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const result = await validateCsv(fd);
                    if (result.success && result.result) {
                      setValidationResult(result.result);
                    } else {
                      // Si hay un error de autenticación o contexto, mostrarlo de forma especial
                      const errorMessage = result.error || 'Error al validar el archivo CSV';
                      setValidationResult({
                        valid: false,
                        errors: [{
                          line: 0,
                          type: 'invalid_type',
                          message: errorMessage,
                        }],
                        summary: {
                          totalRows: 0,
                          validRows: 0,
                          errorCount: 1,
                        },
                      });
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al validar';
                    setValidationResult({
                      valid: false,
                      errors: [{
                        line: 0,
                        type: 'invalid_type',
                        message: errorMessage,
                      }],
                      summary: {
                        totalRows: 0,
                        validRows: 0,
                        errorCount: 1,
                      },
                    });
                  } finally {
                    setIsValidating(false);
                  }
                }
              }}
            />
          </div>

          {isValidating && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Validando CSV...</span>
              </div>
              <p className="mt-2 text-muted">Validando archivo CSV...</p>
            </div>
          )}

          {validationResult && !isValidating && (
            <div className="mt-3">
              {validationResult.valid ? (
                <div>
                  <div className="alert alert-success">
                    <h6 className="alert-heading">
                      <i className="bi bi-check-circle me-2" />
                      Validación exitosa
                    </h6>
                    <p className="mb-0">
                      El archivo CSV ha sido validado correctamente. Puedes proceder con la importación.
                    </p>
                  </div>
                  
                  {validationResult.categoriesToCreate && validationResult.categoriesToCreate.length > 0 && (
                    <div className="alert alert-info mb-3">
                      <h6 className="alert-heading">
                        <i className="bi bi-info-circle me-2" />
                        Categorías a crear automáticamente
                      </h6>
                      <p className="mb-2">
                        Las siguientes categorías no existen en el sistema y se crearán automáticamente durante la importación:
                      </p>
                      <ul className="mb-0">
                        {validationResult.categoriesToCreate.map((catName, idx) => (
                          <li key={idx}><strong>{catName}</strong></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {validationResult.summary && (
                    <div className="mb-3">
                      <h6>{t('summary')}</h6>
                      <ul className="mb-0">
                        <li>{t('totalRows', { count: validationResult.summary.totalRows })}</li>
                        <li>{t('validRows', { count: validationResult.summary.validRows })}</li>
                        {validationResult.categoriesToCreate && validationResult.categoriesToCreate.length > 0 && (
                          <li>{t('categoriesToCreateCount', { count: validationResult.categoriesToCreate.length })}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {validationResult.preview && (
                    <div className="mb-3">
                      <h6>Vista previa (primeras filas):</h6>
                      <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered">
                          <thead className="table-light sticky-top">
                            <tr>
                              {validationResult.preview.headers.map((header, idx) => (
                                <th key={idx}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.preview.sampleRows.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="alert alert-danger">
                    <h6 className="alert-heading">
                      <i className="bi bi-exclamation-triangle me-2" />
                      Errores de validación encontrados
                    </h6>
                    <p className="mb-0">
                      Se encontraron {validationResult.summary?.errorCount || validationResult.errors?.length || 0} error(es) en el archivo CSV. 
                      Por favor corrige los errores antes de continuar.
                    </p>
                  </div>

                  {validationResult.summary && (
                    <div className="mb-3">
                      <h6>Resumen:</h6>
                      <ul className="mb-0">
                        <li>Total de filas: <strong>{validationResult.summary.totalRows}</strong></li>
                        <li>Filas válidas: <strong>{validationResult.summary.validRows}</strong></li>
                        <li>Errores encontrados: <strong className="text-danger">{validationResult.summary.errorCount}</strong></li>
                      </ul>
                    </div>
                  )}

                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="mb-3">
                      <h6>Detalles de errores:</h6>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '80px' }}>Línea</th>
                              <th style={{ width: '120px' }}>Columna</th>
                              <th style={{ width: '150px' }}>Tipo</th>
                              <th>Mensaje</th>
                              <th style={{ width: '150px' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.errors.map((error, idx) => (
                              <tr key={idx}>
                                <td>{error.line || '-'}</td>
                                <td>{error.column || '-'}</td>
                                <td>
                                  <span className="badge bg-danger">
                                    {error.type === 'missing_column' && 'Columna faltante'}
                                    {error.type === 'invalid_type' && 'Tipo inválido'}
                                    {error.type === 'empty_required' && 'Campo vacío'}
                                    {error.type === 'duplicate_id' && 'ID duplicado'}
                                    {error.type === 'category_not_found' && 'Categoría no existe'}
                                    {error.type === 'id_exists' && 'ID ya existe'}
                                    {error.type === 'invalid_url' && 'URL inválida'}
                                    {!['missing_column', 'invalid_type', 'empty_required', 'duplicate_id', 'category_not_found', 'id_exists', 'invalid_url'].includes(error.type) && error.type}
                                  </span>
                                </td>
                                <td>{error.message}</td>
                                <td className="text-truncate" style={{ maxWidth: '150px' }} title={error.value}>
                                  {error.value || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {executionResult && (
            <div className="mt-3">
              {executionResult.success ? (
                <div className="alert alert-success">
                  <h6 className="alert-heading">
                    <i className="bi bi-check-circle me-2" />
                    Importación completada
                  </h6>
                  <p className="mb-0">
                    Se han importado <strong>{executionResult.createdCount || 0}</strong> producto(s) correctamente.
                  </p>
                </div>
              ) : (
                <div className="alert alert-danger">
                  <h6 className="alert-heading">
                    <i className="bi bi-exclamation-triangle me-2" />
                    Error en la importación
                  </h6>
                  {executionResult.errors && executionResult.errors.length > 0 ? (
                    <ul className="mb-0">
                      {executionResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-0">Error desconocido al ejecutar la importación</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
              setValidationResult(null);
              setExecutionResult(null);
            }}
            disabled={isExecuting}
          >
            Cerrar
          </Button>
          {validationResult?.valid && !executionResult && (
            <Button
              variant="success"
              disabled={!importFile || isExecuting || isValidating}
              onClick={async () => {
                if (!importFile || isExecuting) return;
                setIsExecuting(true);
                setExecutionResult(null);
                try {
                  const fd = new FormData();
                  fd.append('file', importFile);
                  const result = await executeCsvImport(fd);
                  setExecutionResult(result);
                } catch (error) {
                  setExecutionResult({
                    success: false,
                    errors: [error instanceof Error ? error.message : 'Error desconocido'],
                  });
                } finally {
                  setIsExecuting(false);
                }
              }}
            >
              {isExecuting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Ejecutando importación...
                </>
              ) : (
                <>
                  <i className="bi bi-play-fill me-2" />
                  Ejecutar importación
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Box>
  );
}
