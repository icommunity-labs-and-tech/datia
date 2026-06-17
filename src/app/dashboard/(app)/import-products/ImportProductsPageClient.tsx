'use client';

import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Box from '@/components/Box';
import BoxHeader from '@/components/BoxHeader';
import { validateCsv, type ValidationResult } from '@/actions/items/validateCsv';
import { executeCsvImport } from '@/actions/items/executeCsvImport';
import { MAX_CSV_ROWS, formatMaxFileSize } from '@/actions/items/csvImportLimits';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { createSupportMessage } from '@/actions/support-messages/create';

const CSV_COLUMNS = [
  { name: 'id', required: true },
  { name: 'name', required: true },
  { name: 'categoryName', required: true },
  { name: 'description', required: false },
];


export default function ImportProductsPageClient() {
  const t = useTranslations('importProductsPage');
  const tExports = useTranslations('exports');

  const [importFile, setImportFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    createdCount?: number;
    errors?: string[];
  } | null>(null);

  // Support form state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState(false);

  const handleSendSupport = async () => {
    if (!supportMsg.trim() || isSendingSupport) return;
    setIsSendingSupport(true);
    setSupportError(false);
    try {
      await createSupportMessage({
        subject: supportSubject.trim() || t('supportSubjectPlaceholder'),
        message: supportMsg.trim(),
        page: '/dashboard/import-products',
      });
      setSupportSent(true);
      setSupportSubject('');
      setSupportMsg('');
    } catch {
      setSupportError(true);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const errorMessage = result.error || t('unknownError');
          setValidationResult({
            valid: false,
            errors: [{ line: 0, type: 'invalid_type', message: errorMessage }],
            summary: { totalRows: 0, validRows: 0, errorCount: 1 },
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('unknownError');
        setValidationResult({
          valid: false,
          errors: [{ line: 0, type: 'invalid_type', message: errorMessage }],
          summary: { totalRows: 0, validRows: 0, errorCount: 1 },
        });
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleExecuteImport = async () => {
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
        errors: [error instanceof Error ? error.message : t('unknownError')],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setImportFile(null);
    setValidationResult(null);
    setExecutionResult(null);
  };

  return (
    <>
    <Box>
      <BoxHeader title={t('pageTitle')} icon="bi-cloud-upload" />

      {/* CSV Format Illustration */}
      <div className="mb-4 px-1">
        <h6>
          <i className="bi bi-table me-2" />
          {t('csvFormatTitle')}
        </h6>
        <p className="text-muted small mb-3">{t('csvFormatDescription')}</p>
        <div className="border rounded overflow-hidden">
          <table className="table table-sm table-bordered mb-0" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8f5e9' }}>
                {CSV_COLUMNS.map((col) => (
                  <th key={col.name} className="px-3 py-2">
                    {col.name}
                    {col.required && <span className="text-danger ms-1">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [t('sampleRow1Id'), t('sampleRow1Name'), t('sampleRow1Category'), t('sampleRow1Description')],
                [t('sampleRow2Id'), t('sampleRow2Name'), t('sampleRow2Category'), t('sampleRow2Description')],
                [t('sampleRow3Id'), t('sampleRow3Name'), t('sampleRow3Category'), t('sampleRow3Description')],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2">
                      {cell || <span className="text-muted">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted small mt-2">
          <span className="text-danger">*</span> {t('requiredColumnsNote')}
        </p>
      </div>

      <hr />

      {/* Import Limits */}
      <div className="alert alert-info mb-4 mx-1">
        <h6 className="alert-heading">
          <i className="bi bi-info-circle me-2" />
          {t('importLimitsTitle')}
        </h6>
        <ul className="mb-0 small">
          <li>{t('maxFileSize', { size: formatMaxFileSize() })}</li>
          <li>{t('maxRows', { count: MAX_CSV_ROWS })}</li>
          <li>{t('splitFileTip')}</li>
        </ul>
      </div>

      <hr />

      {/* File Upload */}
      <div className="px-1">
        <p className="text-muted small mb-3">{t('csvColumnsNote')}</p>

        <div className="mb-3">
          <Form.Label>{t('csvFileLabel')}</Form.Label>
          <Form.Control
            type="file"
            accept=".csv,text/csv"
            disabled={isValidating || isExecuting}
            onChange={handleFileChange}
          />
        </div>

        {/* Validating spinner */}
        {isValidating && (
          <div className="text-center py-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{t('validating')}</span>
            </div>
            <p className="mt-2 text-muted">{t('validating')}</p>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && !isValidating && (
          <div className="mt-3">
            {validationResult.valid ? (
              <div>
                <div className="alert alert-success">
                  <h6 className="alert-heading">
                    <i className="bi bi-check-circle me-2" />
                    {t('validationSuccess')}
                  </h6>
                  <p className="mb-0">{t('validationSuccessMessage')}</p>
                </div>

                {validationResult.categoriesToCreate && validationResult.categoriesToCreate.length > 0 && (
                  <div className="alert alert-info mb-3">
                    <h6 className="alert-heading">
                      <i className="bi bi-info-circle me-2" />
                      {t('categoriesToCreate')}
                    </h6>
                    <p className="mb-2">{t('categoriesToCreateDescription')}</p>
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
                    <h6>{t('preview')}</h6>
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
                    {t('validationErrors')}
                  </h6>
                  <p className="mb-0">
                    {t('validationErrorsMessage', {
                      count: validationResult.summary?.errorCount || validationResult.errors?.length || 0,
                    })}
                  </p>
                </div>

                {validationResult.summary && (
                  <div className="mb-3">
                    <h6>{t('summary')}</h6>
                    <ul className="mb-0">
                      <li>{t('totalRows', { count: validationResult.summary.totalRows })}</li>
                      <li>{t('validRows', { count: validationResult.summary.validRows })}</li>
                      <li className="text-danger">
                        <strong>{validationResult.summary.errorCount}</strong> error(es)
                      </li>
                    </ul>
                  </div>
                )}

                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="mb-3">
                    <h6>{t('errorDetails')}</h6>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '80px' }}>{t('errorLine')}</th>
                            <th style={{ width: '120px' }}>{t('errorColumn')}</th>
                            <th style={{ width: '150px' }}>{t('errorType')}</th>
                            <th>{t('errorMessage')}</th>
                            <th style={{ width: '150px' }}>{t('errorValue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.errors.map((error, idx) => (
                            <tr key={idx}>
                              <td>{error.line || '-'}</td>
                              <td>{error.column || '-'}</td>
                              <td>
                                <span className="badge bg-danger">
                                  {t(`errorTypes.${error.type}` as any) || error.type}
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

        {/* Execution Result */}
        {executionResult && (
          <div className="mt-3">
            {executionResult.success ? (
              <div className="alert alert-success">
                <h6 className="alert-heading">
                  <i className="bi bi-check-circle me-2" />
                  {t('importComplete')}
                </h6>
                <p className="mb-2">
                  {t('importCompleteMessage', { count: executionResult.createdCount || 0 })}
                </p>
                <Link href="/dashboard/items" className="btn btn-outline-success btn-sm">
                  <i className="bi bi-arrow-right me-1" />
                  {t('goToProducts')}
                </Link>
              </div>
            ) : (
              <div className="alert alert-danger">
                <h6 className="alert-heading">
                  <i className="bi bi-exclamation-triangle me-2" />
                  {t('importError')}
                </h6>
                {executionResult.errors && executionResult.errors.length > 0 ? (
                  <ul className="mb-0">
                    {executionResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-0">{t('unknownError')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="d-flex gap-2 mt-4">
          {validationResult?.valid && !executionResult && (
            <Button
              variant="success"
              disabled={!importFile || isExecuting || isValidating}
              onClick={handleExecuteImport}
            >
              {isExecuting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  {t('executing')}
                </>
              ) : (
                <>
                  <i className="bi bi-play-fill me-2" />
                  {t('executeImport')}
                </>
              )}
            </Button>
          )}
          {(validationResult || executionResult) && (
            <Button variant="outline-secondary" onClick={handleReset} disabled={isExecuting}>
              <i className="bi bi-arrow-counterclockwise me-1" />
              {t('close')}
            </Button>
          )}
        </div>
      </div>
    </Box>

    <Box>
      <BoxHeader title={t('supportTitle')} icon="bi-headset" />
      <p className="text-muted small mb-3">{t('supportMessage')}</p>

      {supportSent ? (
        <div className="alert alert-success">
          <h6 className="alert-heading">
            <i className="bi bi-check-circle me-2" />
            {t('messageSent')}
          </h6>
          <p className="mb-2">{t('messageSentDescription')}</p>
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => setSupportSent(false)}
          >
            {t('sendAnother')}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <Form.Label className="small">{t('supportSubjectLabel')}</Form.Label>
            <Form.Control
              type="text"
              placeholder={t('supportSubjectPlaceholder')}
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              disabled={isSendingSupport}
            />
          </div>
          <div className="mb-3">
            <Form.Label className="small">{t('supportMessageLabel')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={t('supportMessagePlaceholder')}
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              disabled={isSendingSupport}
            />
          </div>
          {supportError && (
            <div className="alert alert-danger small py-2 mb-3">
              <i className="bi bi-exclamation-triangle me-1" />
              {t('sendError')}
            </div>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={!supportMsg.trim() || isSendingSupport}
            onClick={handleSendSupport}
          >
            {isSendingSupport ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                {t('sending')}
              </>
            ) : (
              <>
                <i className="bi bi-send me-1" />
                {t('sendMessage')}
              </>
            )}
          </Button>
        </>
      )}
    </Box>
    </>
  );
}
