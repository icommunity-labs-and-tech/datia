'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Form, Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import { useTranslations } from 'next-intl';

export interface FieldDefinition {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'select' | 'image' | 'geolocation';
  required?: boolean;
  options?: string[]; // Para campos de tipo select
}

interface DynamicFieldBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  className?: string;
  showValidationErrors?: boolean;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

// Función helper para crear los tipos de campo con traducciones
const createFieldTypes = (t: (key: string) => string) => [
  { value: 'text', label: t('text') },
  { value: 'textarea', label: t('textarea') },
  { value: 'number', label: t('number') },
  { value: 'email', label: t('email') },
  { value: 'date', label: t('date') },
  { value: 'select', label: t('select') },
  { value: 'image', label: t('image') },
  { value: 'geolocation', label: t('geolocation') },
] as const;

// Función para generar colores automáticamente para las opciones
const getOptionColor = (index: number): string => {
  const colors = [
    '#5bc0de', // Bootstrap info (azul)
    '#5cb85c', // Bootstrap success (verde)
    '#f0ad4e', // Bootstrap warning (amarillo/naranja)
    '#d9534f', // Bootstrap danger (rojo)
    '#337ab7', // Bootstrap primary (azul oscuro)
    '#6f42c1', // Bootstrap secondary (púrpura)
    '#20c997', // Bootstrap teal (turquesa)
    '#fd7e14', // Bootstrap orange (naranja)
    '#e83e8c', // Bootstrap pink (rosa)
    '#6c757d', // Bootstrap secondary (gris)
  ];
  return colors[index % colors.length];
};



export default function DynamicFieldBuilder({
  fields,
  onChange,
  className = '',
  showValidationErrors = false,
  onValidationChange
}: DynamicFieldBuilderProps) {
  const t = useTranslations('fieldTypes');
  const tCommon = useTranslations('common');
  const tForms = useTranslations('forms');
  const FIELD_TYPES = useMemo(() => createFieldTypes(t), [t]);
  const [localFields, setLocalFields] = useState<FieldDefinition[]>(fields);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  // Actualizar errores de validación cuando cambien los campos
  useEffect(() => {
    const errors = validateFields(localFields);
    setValidationErrors(errors);
    
    // Notificar al componente padre sobre el estado de validación
    if (onValidationChange) {
      onValidationChange(errors.length === 0, errors);
    }
  }, [localFields, onValidationChange]);

  // Función para validar los campos
  const validateFields = (fieldsToValidate: FieldDefinition[]): string[] => {
    const errors: string[] = [];
    
    fieldsToValidate.forEach((field, index) => {
      if (!field.name || field.name.trim() === '') {
        errors.push(tForms('fieldMustHaveNameWithNumber', { number: index + 1 }));
      }
      
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        const fieldName = field.name || tCommon('fieldName') + ` ${index + 1}`;
        errors.push(tForms('selectMustHaveOptions', { name: fieldName }));
      }
    });
    
    return errors;
  };

  const updateFieldsWithValidation = (newFields: FieldDefinition[]) => {
    setLocalFields(newFields);
    
    // Siempre llamar onChange para permitir la edición continua
    // Solo validar cuando se intente enviar el formulario
    onChange(newFields);
  };

  const addField = () => {
    const newField: FieldDefinition = {
      name: '',
      type: 'text',
      required: false,
    };
    
    const updatedFields = [...localFields, newField];
    updateFieldsWithValidation(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = localFields.filter((_, i) => i !== index);
    updateFieldsWithValidation(updatedFields);
  };

  const updateField = (index: number, field: Partial<FieldDefinition>) => {
    const updatedFields = localFields.map((f, i) => 
      i === index ? { ...f, ...field } : f
    );
    updateFieldsWithValidation(updatedFields);
  };

  const addOption = (fieldIndex: number, value?: string) => {
    const field = localFields[fieldIndex];
    if (field.type === 'select') {
      const newOptions = [...(field.options || []), value || 'Nueva opción'];
      updateField(fieldIndex, { options: newOptions });
    }
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = localFields[fieldIndex];
    if (field.type === 'select' && field.options) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateField(fieldIndex, { options: newOptions });
    }
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = localFields[fieldIndex];
    if (field.type === 'select' && field.options) {
      const newOptions = field.options.filter((_, i) => i !== optionIndex);
      updateField(fieldIndex, { options: newOptions });
    }
  };

  return (
    <div className={`dynamic-field-builder ${className}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Campos específicos de la categoría</h6>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={addField}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-plus-lg"></i>
          Agregar campo
        </Button>
      </div>

      {/* Mostrar errores de validación solo cuando se solicite */}
      {showValidationErrors && validationErrors.length > 0 && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading className="h6">Errores de validación:</Alert.Heading>
          <ul className="mb-0">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {localFields.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <p className="mb-0">No hay campos específicos definidos</p>
          <small>Haz clic en &quot;Agregar campo&quot; para comenzar</small>
        </div>
      ) : (
        <div className="fields-list">
          {localFields.map((field, index) => (
            <Card key={index} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary">{tCommon('fieldName')} {index + 1}</Badge>
                  {field.required && (
                    <Badge bg="danger" className="small">{tCommon('required')}</Badge>
                  )}
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeField(index)}
                  className="d-flex align-items-center gap-1"
                >
                  <i className="bi bi-x-lg"></i>
                </Button>
              </Card.Header>
              <Card.Body className="py-3">
                <Row>
                  <Col md={5}>
                    <Form.Group className="mb-3">
                      <Form.Label>{tCommon('fieldName')}</Form.Label>
                      <Form.Control
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        placeholder={tCommon('fieldNamePlaceholder')}
                        size="sm"
                      />
                      <Form.Text className="text-muted">
                        {tCommon('fieldNameHelp')}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tipo de campo</Form.Label>
                      <Form.Select
                        value={field.type}
                        onChange={(e) => updateField(index, { 
                          type: e.target.value as FieldDefinition['type'],
                          options: e.target.value === 'select' ? ['Opción 1'] : undefined
                        })}
                        size="sm"
                      >
                        {FIELD_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>{tCommon('fieldRequired')}</Form.Label>
                      <div className="d-flex align-items-center h-100">
                        <Form.Check
                          type="checkbox"
                          label={tCommon('required')}
                          checked={field.required || false}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {field.type === 'select' && (
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label className="mb-2">Opciones</Form.Label>
                        
                        {/* Bootstrap Tags Input style */}
                        <div className="bootstrap-tagsinput" style={{
                          border: '1px solid #ced4da',
                          borderRadius: '0.375rem',
                          padding: '2px 6px',
                          minHeight: '38px',
                          backgroundColor: '#fff',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {/* Tags display */}
                          {field.options?.map((option, optionIndex) => (
                            <span key={optionIndex} className="tag label label-info" style={{
                              backgroundColor: getOptionColor(optionIndex),
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '3px',
                              fontSize: '12px',
                              display: 'inline-block',
                              margin: '1px'
                            }}>
                              {option}
                              <span 
                                style={{ 
                                  marginLeft: '5px', 
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}
                                onClick={() => removeOption(index, optionIndex)}
                              >
                                ×
                              </span>
                            </span>
                          ))}
                          
                          {/* Input for new tags */}
                          <input
                            type="text"
                            placeholder="Escribe una opción y presiona Enter"
                            style={{
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              padding: '4px',
                              fontSize: '14px',
                              minWidth: '120px',
                              flex: '1'
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const value = e.currentTarget.value.trim();
                                if (value && !field.options?.includes(value)) {
                                  addOption(index, value);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          
                          {(!field.options || field.options.length === 0) && (
                            <span style={{ 
                              color: '#6c757d', 
                              fontSize: '14px',
                              fontStyle: 'italic'
                            }}>
                              No hay opciones definidas
                            </span>
                          )}
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
