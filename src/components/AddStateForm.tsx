'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { listStatusTypes } from '@/actions/statusTypes';
import { createState } from '@/actions/states';
import { getItem } from '@/actions/items';
import GeolocationMap from './GeolocationMapClient';
import { parseTemplate, generateFieldLabel } from '@/lib/template-helpers';

interface StatusType {
  id: string;
  name: string;
  description: string;
  template?: any[];
  category?: {
    id: string;
    name: string;
  };
}

interface AddStateFormProps {
  item?: any;
  itemId?: string;
  onSuccess?: () => void;
  onStateCreated?: (state: any) => void;
  show?: boolean;
  onHide?: () => void;
}

export default function AddStateForm({ 
  item, 
  itemId, 
  onSuccess, 
  onStateCreated, 
  show = true, 
  onHide 
}: AddStateFormProps) {
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const [statusTypes, setStatusTypes] = useState<StatusType[]>([]);
  const [selectedStatusType, setSelectedStatusType] = useState<StatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    description: '',
  });
  const [templateConfig, setTemplateConfig] = useState<Record<string, any>>({});

  // Cargar tipos de estado disponibles para la organización
  useEffect(() => {
    const fetchStatusTypes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await listStatusTypes();
        setStatusTypes(data);
        // Preseleccionar por última elección del operador (si existe)
        try {
          const last = window.localStorage.getItem('app:lastStatusTypeId');
          if (last) {
            const match = data.find((st: StatusType) => st.id === last);
            if (match) setSelectedStatusType(match);
          }
        } catch {}
      } catch (err) {
        console.error('Error cargando tipos de estado:', err);
        setError(`Error al cargar los tipos de estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatusTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusType) {
      setError('Debes seleccionar un tipo de estado');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Validar campos requeridos del template
    if (selectedStatusType.template && Array.isArray(selectedStatusType.template)) {
      for (const field of selectedStatusType.template) {
        if (field.required) {
          const fieldName = field.name;
          const fieldValue = templateConfig[fieldName];
          
          if (field.type === 'geolocation' && (!fieldValue || !fieldValue.lat || !fieldValue.lng)) {
            setError(tForms('fieldRequiredWithName', { field: field.label || fieldName }));
            setIsSubmitting(false);
            return;
          }
          
          if (field.type !== 'geolocation' && (!fieldValue || fieldValue === '')) {
            setError(tForms('fieldRequiredWithName', { field: field.label || fieldName }));
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    try {
      const result = await createState({
        itemId: itemId || item?.id,
        statusTypeId: selectedStatusType.id,
        description: formData.description,
        templateConfig: Object.keys(templateConfig).length > 0 ? templateConfig : undefined,
      });

      // Guardar última elección para atajos futuros
      try { window.localStorage.setItem('app:lastStatusTypeId', selectedStatusType.id); } catch {}

      if (onStateCreated) {
        onStateCreated(result);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const friendly = typeof err === 'string'
        ? err
        : (err?.message
          || (err?.digest ? 'No se pudo crear el estado: verifica tu identidad (KYC) o reintenta la certificación.' : null)
          || 'Error al crear el estado');
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando tipos de estado...</span>
        </Spinner>
        <p className="mt-2">Cargando tipos de estado disponibles...</p>
      </div>
    );
  }

  const formContent = (
    <div className="add-state-form">
      <Form onSubmit={handleSubmit}>
        {/* Selección rápida de tipo (chips) */}
        {statusTypes.length > 0 && (
          <div className="mb-3 d-flex flex-wrap gap-2">
            {statusTypes.slice(0, 6).map((st) => (
              <Badge
                key={st.id}
                bg={selectedStatusType?.id === st.id ? 'primary' : 'secondary'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedStatusType(st)}
              >
                {st.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Selección del tipo de estado */}
        <Form.Group className="mb-4">
          <Form.Label className="form-label">
            <span className="label-icon">🏷️</span>
            Tipo de Estado *
          </Form.Label>
          <Form.Select
            value={selectedStatusType?.id || ''}
            onChange={(e) => {
              const statusType = statusTypes.find(st => st.id === e.target.value);
              setSelectedStatusType(statusType || null);
              // Reset templateConfig cuando cambia el tipo de estado
              setTemplateConfig({});
            }}
            required
            disabled={isSubmitting}
            className="form-control-custom"
          >
            <option value="">Selecciona un tipo de estado</option>
            {statusTypes.map((statusType) => (
              <option key={statusType.id} value={statusType.id}>
                {statusType.name}
              </option>
            ))}
          </Form.Select>
          {selectedStatusType && (
            <Form.Text className="text-muted">
              {selectedStatusType.description}
            </Form.Text>
          )}
        </Form.Group>

        {/* Preview del título generado */}
        {selectedStatusType && item && (
          <Alert variant="info" className="mb-4">
            <strong>Título generado:</strong> {item.name} - {selectedStatusType.name}
          </Alert>
        )}

        {/* Descripción */}
        <Form.Group className="mb-4">
          <Form.Label className="form-label">
            <span className="label-icon">📄</span>
            Descripción
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe el estado actual del producto..."
            disabled={isSubmitting}
            className="form-control-custom"
          />
        </Form.Group>

        {/* Campos del template del StatusType */}
        {selectedStatusType && (() => {
          const templateArray = parseTemplate(selectedStatusType.template);
          
          if (templateArray.length === 0) {
            return null;
          }
          
          return (
            <>
              {templateArray.map((field: any, index: number) => {
                const fieldName = field.name || `field_${index}`;
                const fieldLabel = field.label || generateFieldLabel(fieldName);
                const fieldValue = templateConfig[fieldName];

              // Renderizar campo de geolocalización
              if (field.type === 'geolocation') {
                return (
                  <div key={index} className="mb-4">
                    <GeolocationMap
                      value={fieldValue ? { lat: fieldValue.lat, lng: fieldValue.lng } : undefined}
                      onChange={(coords) => {
                        setTemplateConfig(prev => ({
                          ...prev,
                          [fieldName]: coords,
                        }));
                      }}
                      required={field.required}
                      label={fieldLabel}
                    />
                  </div>
                );
              }

              // Renderizar otros tipos de campos
              if (field.type === 'text' || field.type === 'email') {
                return (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>
                      {fieldLabel}
                      {field.required && <span className="text-danger ms-1">*</span>}
                    </Form.Label>
                    <Form.Control
                      type={field.type}
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setTemplateConfig(prev => ({
                          ...prev,
                          [fieldName]: e.target.value,
                        }));
                      }}
                      placeholder={field.placeholder || tCommon('enterField', { field: fieldLabel.toLowerCase() })}
                      required={field.required}
                      disabled={isSubmitting}
                      className="form-control-custom"
                    />
                  </Form.Group>
                );
              }

              if (field.type === 'number') {
                return (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>
                      {fieldLabel}
                      {field.required && <span className="text-danger ms-1">*</span>}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setTemplateConfig(prev => ({
                          ...prev,
                          [fieldName]: e.target.value ? parseFloat(e.target.value) : undefined,
                        }));
                      }}
                      placeholder={field.placeholder || tCommon('enterField', { field: fieldLabel.toLowerCase() })}
                      required={field.required}
                      disabled={isSubmitting}
                      className="form-control-custom"
                    />
                  </Form.Group>
                );
              }

              if (field.type === 'date') {
                return (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>
                      {fieldLabel}
                      {field.required && <span className="text-danger ms-1">*</span>}
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setTemplateConfig(prev => ({
                          ...prev,
                          [fieldName]: e.target.value,
                        }));
                      }}
                      required={field.required}
                      disabled={isSubmitting}
                      className="form-control-custom"
                    />
                  </Form.Group>
                );
              }

              if (field.type === 'select' && Array.isArray(field.options)) {
                return (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>
                      {fieldLabel}
                      {field.required && <span className="text-danger ms-1">*</span>}
                    </Form.Label>
                    <Form.Select
                      value={fieldValue || ''}
                      onChange={(e) => {
                        setTemplateConfig(prev => ({
                          ...prev,
                          [fieldName]: e.target.value,
                        }));
                      }}
                      required={field.required}
                      disabled={isSubmitting}
                      className="form-control-custom"
                    >
                      <option value="">Seleccionar...</option>
                      {field.options.map((option: string, optIndex: number) => (
                        <option key={optIndex} value={option}>
                          {option}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                );
              }

                return null;
              })}
            </>
          );
        })()}


        {/* Mensaje de error */}
        {error && (
          <Alert variant="danger" className="error-alert mb-4">
            <div className="d-flex align-items-center">
              <span className="error-icon me-2">⚠️</span>
              <div>
                <h6 className="mb-1">Error al crear estado</h6>
                <p className="mb-0">{error}</p>
              </div>
            </div>
          </Alert>
        )}

        {/* Botones de acción */}
        <div className="form-actions">
          <Button
            type="submit"
            variant="success"
            size="lg"
            disabled={isSubmitting || !selectedStatusType}
            className="submit-btn"
          >
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creando estado...
              </>
            ) : (
              <>
                <span className="me-2">💾</span>
                Guardar Estado
              </>
            )}
          </Button>
        </div>
      </Form>

      <style jsx>{`
        .add-state-form {
          padding: 1rem 0;
        }

        .form-label {
          font-weight: 600;
          color: #333;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .label-icon {
          margin-right: 0.5rem;
        }

        .form-control-custom {
          border-radius: 8px;
          padding: 0.75rem;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }

        .form-control-custom:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }


        .form-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
          padding: 1rem 0;
        }

        .submit-btn {
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(40, 167, 69, 0.4);
        }

        .error-alert {
          border-radius: 12px;
          border: none;
          box-shadow: 0 4px 20px rgba(220, 53, 69, 0.2);
        }

        .error-icon {
          font-size: 1.5rem;
        }

        @media (max-width: 768px) {
          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );

  // Si se está usando como modal
  if (show !== undefined && onHide) {
    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Estado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formContent}
        </Modal.Body>
      </Modal>
    );
  }

  // Si se está usando como componente normal
  return formContent;
}
