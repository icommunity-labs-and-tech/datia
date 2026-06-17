'use client';

import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Form, Alert } from 'react-bootstrap';

export interface StatusTypeFieldDefinition {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'image' | 'geolocation';
  required?: boolean;
  options?: string[]; // Para campos de tipo select
}

interface StatusTypeFieldBuilderProps {
  fields: StatusTypeFieldDefinition[];
  onChange: (fields: StatusTypeFieldDefinition[]) => void;
  className?: string;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export interface StatusTypeFieldBuilderRef {
  validateAll: () => boolean;
  getErrors: () => string[];
}

// Función helper para crear los tipos de campo con traducciones e iconos
const createFieldTypes = (t: (key: string) => string) => [
  { value: 'text', label: t('text'), icon: 'bi-text-left', color: '#0d6efd' },
  { value: 'number', label: t('number'), icon: 'bi-123', color: '#6610f2' },
  { value: 'email', label: t('email'), icon: 'bi-envelope', color: '#0dcaf0' },
  { value: 'date', label: t('date'), icon: 'bi-calendar-date', color: '#198754' },
  { value: 'select', label: t('select'), icon: 'bi-list-check', color: '#fd7e14' },
  { value: 'image', label: t('image'), icon: 'bi-image', color: '#d63384' },
  { value: 'geolocation', label: t('geolocation'), icon: 'bi-geo-alt', color: '#dc3545' },
] as const;

// Función para generar colores automáticamente para las opciones
const getOptionColor = (index: number): string => {
  const colors = [
    '#5bc0de', '#5cb85c', '#f0ad4e', '#d9534f', '#337ab7',
    '#6f42c1', '#20c997', '#fd7e14', '#e83e8c', '#6c757d',
  ];
  return colors[index % colors.length];
};

interface SortableFieldItemProps {
  field: StatusTypeFieldDefinition;
  index: number;
  fieldTypes: ReturnType<typeof createFieldTypes>;
  onUpdate: (field: Partial<StatusTypeFieldDefinition>) => void;
  onRemove: () => void;
  onBlur: () => void;
  onAddOption: (value?: string) => void;
  onRemoveOption: (optionIndex: number) => void;
  tCommon: (key: string) => string;
}

function SortableFieldItem({
  field,
  index,
  fieldTypes,
  onUpdate,
  onRemove,
  onBlur,
  onAddOption,
  onRemoveOption,
  tCommon,
}: SortableFieldItemProps) {
  const currentFieldType = useMemo(
    () => fieldTypes.find(ft => ft.value === field.type),
    [fieldTypes, field.type]
  );

  return (
    <div className="field-item mb-2">
      <div
        className="field-card rounded-2 bg-white"
        style={{
          borderTop: '1px solid #dee2e6',
          borderRight: '1px solid #dee2e6',
          borderBottom: '1px solid #dee2e6',
          borderLeft: `4px solid ${currentFieldType?.color}`,
          paddingTop: '0.5rem',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem',
          paddingBottom: '0.2rem',
        }}
      >
        <div className="d-flex align-items-start gap-2">
          {/* Content */}
          <div className="flex-grow-1">
            {/* All fields in one row: Name, Type, Required, Remove */}
            <div className="d-flex align-items-center gap-2 mb-2">
              {/* Name Input */}
              <Form.Control
                type="text"
                value={field.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                onBlur={onBlur}
                placeholder={`${tCommon('fieldName')} ${index + 1}`} 
              />

              {/* Type Select */}
              <Form.Select
                value={field.type}
                onChange={(e) =>
                  onUpdate({
                    type: e.target.value as StatusTypeFieldDefinition['type'],
                    options: e.target.value === 'select' ? ['Opción 1'] : undefined,
                  })
                }
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Form.Select>

              {/* Required Switch */}
              <div className="d-flex align-items-center gap-1">
                <Form.Check
                  type="switch"
                  id={`required-${index}`}
                  checked={field.required || false}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  style={{ fontSize: '11px' }}
                />
                <label
                  htmlFor={`required-${index}`}
                  className="text-muted mb-0"
                  style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >
                  Requerido
                </label>
              </div>

              {/* Remove Button */}
              <Button
                variant="link"
                size="sm"
                onClick={onRemove}
                className="text-danger p-0 ms-auto"
                style={{ fontSize: '14px', width: '40px', height: '40px', flexShrink: 0 }}
              >
                <i className="bi bi-trash"></i>
              </Button>
            </div>

            {/* Options for Select Type */}
            {field.type === 'select' && (
              <div>
                <div
                  className="options-container border rounded p-1"

                >
                  {/* Tags display */}
                  {field.options?.map((option, optionIndex) => (
                    <span
                      key={optionIndex}
                      className="option-tag"
  
                    >
                      {option}
                      <span
                        style={{
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          opacity: 0.8,
                          lineHeight: 1,
                        }}
                        onClick={() => onRemoveOption(optionIndex)}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                      >
                        ×
                      </span>
                    </span>
                  ))}

                  {/* Input for new tags */}
                  <input
                    type="text"
                    placeholder="Escribe y presiona Enter"
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      padding: '2px',
                      fontSize: '11px',
                      minWidth: '120px',
                      flex: '1',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !field.options?.includes(value)) {
                          onAddOption(value);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatusTypeFieldBuilder = forwardRef<StatusTypeFieldBuilderRef, StatusTypeFieldBuilderProps>(
  ({ fields, onChange, className = '', onValidationChange }, ref) => {
    const t = useTranslations('fieldTypes');
    const tCommon = useTranslations('common');
    const tForms = useTranslations('forms');
    const FIELD_TYPES = useMemo(() => createFieldTypes(t), [t]);
    const [localFields, setLocalFields] = useState<StatusTypeFieldDefinition[]>(fields);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [touchedFields, setTouchedFields] = useState<Set<number>>(new Set());
    const [validateAll, setValidateAll] = useState(false);

    useEffect(() => {
      setLocalFields(fields);
    }, [fields]);

    // Exponer métodos al componente padre mediante ref
    useImperativeHandle(ref, () => ({
      validateAll: () => {
        const allTouched = new Set(localFields.map((_, index) => index));
        setTouchedFields(allTouched);
        setValidateAll(true);
        const errors = validateFields(localFields, allTouched, true);
        setValidationErrors(errors);
        if (onValidationChange) {
          onValidationChange(errors.length === 0, errors);
        }
        return errors.length === 0;
      },
      getErrors: () => {
        return validateFields(localFields, touchedFields, validateAll);
      },
    }));

    // Notificar al padre sobre cambios en la validación
    useEffect(() => {
      if (onValidationChange) {
        const errors = validateFields(localFields, touchedFields, validateAll);
        onValidationChange(errors.length === 0, errors);
      }
    }, [localFields, touchedFields, validateAll, onValidationChange]);

    // Función para validar los campos
    const validateFields = (
      fieldsToValidate: StatusTypeFieldDefinition[],
      touchedSet: Set<number> = new Set(),
      validateAllFields: boolean = false
    ): string[] => {
      const errors: string[] = [];

      fieldsToValidate.forEach((field, index) => {
        const shouldValidate = validateAllFields || touchedSet.has(index);

        if (shouldValidate) {
          if (!field.name || field.name.trim() === '') {
            errors.push(tForms('fieldMustHaveNameWithNumber', { number: index + 1 }));
          }

          if (field.type === 'select' && (!field.options || field.options.length === 0)) {
            const fieldName = field.name || tCommon('fieldName') + ` ${index + 1}`;
            errors.push(tForms('selectMustHaveOptions', { name: fieldName }));
          }
        }
      });

      return errors;
    };

    const updateFieldsWithValidation = (
      newFields: StatusTypeFieldDefinition[],
      markTouched?: number
    ) => {
      setLocalFields(newFields);

      let updatedTouched = touchedFields;
      if (markTouched !== undefined) {
        updatedTouched = new Set(touchedFields);
        updatedTouched.add(markTouched);
        setTouchedFields(updatedTouched);
      }

      const errors = validateFields(newFields, updatedTouched, validateAll);
      setValidationErrors(errors);
      onChange(newFields);
    };

    const addField = () => {
      const newField: StatusTypeFieldDefinition = {
        name: '',
        type: 'text',
        required: false,
      };

      const updatedFields = [...localFields, newField];
      setLocalFields(updatedFields);
      onChange(updatedFields);
      setValidationErrors([]);
    };

    const removeField = (index: number) => {
      const updatedFields = localFields.filter((_, i) => i !== index);
      updateFieldsWithValidation(updatedFields);
    };

    const updateField = (index: number, field: Partial<StatusTypeFieldDefinition>) => {
      const updatedFields = localFields.map((f, i) => (i === index ? { ...f, ...field } : f));
      updateFieldsWithValidation(updatedFields, index);
    };

    const handleFieldBlur = (index: number) => {
      if (!touchedFields.has(index)) {
        const updatedTouched = new Set(touchedFields);
        updatedTouched.add(index);
        setTouchedFields(updatedTouched);
        const errors = validateFields(localFields, updatedTouched, validateAll);
        setValidationErrors(errors);
      }
    };

    const addOption = (fieldIndex: number, value?: string) => {
      const field = localFields[fieldIndex];
      if (field.type === 'select') {
        const newOptions = [...(field.options || []), value || 'Nueva opción'];
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
      <div className={`status-type-field-builder ${className}`}>
        {/* Header */}
        <div className="mb-3" style={{ marginTop: '0.5rem' }}>
          <h6 className="mb-0" style={{ fontSize: '14px' }}>Campos</h6>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="danger" className="mb-3 py-2 px-3">
            <div className="d-flex align-items-start gap-2">
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '13px' }}></i>
              <div className="flex-grow-1">
                <div className="fw-semibold mb-1" style={{ fontSize: '12px' }}>Errores de validación</div>
                <ul className="mb-0" style={{ fontSize: '11px', paddingLeft: '16px' }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Alert>
        )}

        {/* Fields List */}
        <div className="fields-list">
          {localFields.map((field, index) => (
            <SortableFieldItem
              key={`field-${index}`}
              field={field}
              index={index}
              fieldTypes={FIELD_TYPES}
              onUpdate={(updatedField) => updateField(index, updatedField)}
              onRemove={() => removeField(index)}
              onBlur={() => handleFieldBlur(index)}
              onAddOption={(value) => addOption(index, value)}
              onRemoveOption={(optionIndex) => removeOption(index, optionIndex)}
              tCommon={tCommon}
            />
          ))}
        </div>

        {/* Add Field Button */}
        <Button
          variant="outline-primary"
          size="sm"
          onClick={addField}
          className="w-100"
          style={{ fontSize: '11px', padding: '4px 4px', marginTop: '-0.25rem' }}
        >
          <i className="bi bi-plus-circle me-1" style={{ fontSize: '10px' }}></i>
          Agregar campo
        </Button>

        <style jsx global>{`
          .field-card {
            transition: all 0.15s ease;
          }

          .field-card:hover {
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08) !important;
          }

          .option-tag {
            transition: all 0.12s ease;
          }

          .option-tag:hover {
            transform: translateY(-1px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          }

          .options-container input:focus {
            outline: none;
          }
        `}</style>
      </div>
    );
  }
);

StatusTypeFieldBuilder.displayName = 'StatusTypeFieldBuilder';

export default StatusTypeFieldBuilder;
