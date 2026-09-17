'use client';

import { Modal } from '@/components/legacy/bootstrap-compat';
import { Button } from '@/components/legacy/bootstrap-compat';
import { Form } from '@/components/legacy/bootstrap-compat';
import { Alert } from '@/components/legacy/bootstrap-compat';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { FormTemplate } from './GenericTable';
import WizardImageField from './WizardImageField';
import CategoryTagsInput from './CategoryTagsInput';

type ItemCreationWizardProps = {
  show: boolean;
  onHide: () => void;
  formTemplate: FormTemplate;
  formState: Record<string, any>;
  setFormState: (data: Record<string, any>) => void;
  onSubmit: (combinedData: Record<string, any>, templateFields?: FormTemplate) => void;
  allowTemplateEditing?: boolean;
  attachmentId?: string;
  customFormContent?: React.ReactNode;
  uploadType?: 'product' | 'item';
  onCategoryChange?: (categoryId: string | null) => void;
};

type WizardStep = 1 | 2 | 3 | 4;

export default function ItemCreationWizard({
  show,
  onHide,
  formTemplate,
  formState,
  setFormState,
  onSubmit,
  allowTemplateEditing = true,
  attachmentId,
  customFormContent,
  uploadType = 'item',
  onCategoryChange
}: ItemCreationWizardProps) {
  const t = useTranslations('common');
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingCategoryItems, setIsLoadingCategoryItems] = useState(false);
  const [selectedCopyItemId, setSelectedCopyItemId] = useState<string>('');

  // Reset wizard state when modal opens/closes
  useEffect(() => {
    if (show) {
      setCurrentStep(1);
      setError(null);
      setSelectedCopyItemId('');
    }
  }, [show]);

  // Load category items when categories are selected
  useEffect(() => {
    const categoryIds = formState?.categoryIds || [];
    if (categoryIds.length === 0) {
      setCategoryItems([]);
      setSelectedCopyItemId('');
      return;
    }
    
    const load = async () => {
      try {
        setIsLoadingCategoryItems(true);
        // Usar la primera categoría para cargar items (o podríamos cargar de todas)
        const res = await fetch(`/api/items/by-category?categoryId=${encodeURIComponent(categoryIds[0])}`);
        if (!res.ok) throw new Error('Error cargando items de la categoría');
        const data = await res.json();
        setCategoryItems((data || []).map((i: any) => ({ id: i.id, name: i.name })));
        setSelectedCopyItemId('');
      } catch (e) {
        setCategoryItems([]);
      } finally {
        setIsLoadingCategoryItems(false);
      }
    };
    load();
  }, [formState?.categoryIds]);

  const handleCopyFromItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`);
      if (!res.ok) throw new Error('No se pudo cargar el item seleccionado');
      const item = await res.json();

      const preservedCustomId = formState?.customId || '';
      const preservedCategoryIds = formState?.categoryIds || [];

      // Obtener categorías del item si están disponibles
      let itemCategoryIds: string[] = [];
      if (item.categoryIds && Array.isArray(item.categoryIds)) {
        itemCategoryIds = item.categoryIds;
      } else if (item.categoryId) {
        // Compatibilidad con formato antiguo
        itemCategoryIds = [item.categoryId];
      }

      const merged: Record<string, any> = {
        ...(formState || {}),
        name: item.name || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        categoryIds: itemCategoryIds.length > 0 ? itemCategoryIds : preservedCategoryIds,
        ...(item.templateFields || {}),
      };

      merged.customId = preservedCustomId;
      setFormState(merged);

      if (onCategoryChange && itemCategoryIds.length > 0) {
        onCategoryChange(itemCategoryIds[0]);
      }
    } catch (e: any) {
      setError(e?.message || 'Error copiando datos del item');
    }
  };

  const validateStep = (step: WizardStep): boolean => {
    switch (step) {
      case 1:
        // Categorías son opcionales ahora
        return true;
      case 2:
        // Paso opcional, siempre válido
        return true;
      case 3:
        // Campos básicos requeridos
        const basicFields = ['customId', 'name'];
        return basicFields.every(field => {
          const fieldTemplate = formTemplate.find(f => f.name === field);
          if (fieldTemplate?.required) {
            const value = formState?.[field];
            return value && (typeof value === 'string' ? value.trim() !== '' : true);
          }
          return true;
        });
      case 4:
        // Campos específicos de categoría
        const categoryFields = formTemplate.filter(field => 
          field.name !== 'customId' && 
          field.name !== 'name' && 
          field.name !== 'description' && 
          field.name !== 'imageUrl' && 
          field.name !== 'categoryId'
        );
        return categoryFields.every(field => {
          if (field.required) {
            const value = formState?.[field.name];
            return value && (typeof value === 'string' ? value.trim() !== '' : true);
          }
          return true;
        });
      default:
        return true;
    }
  };

  const handleNext = () => {
    setError(null);
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as WizardStep);
    } else {
      setError(t('completeRequiredFields'));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!validateStep(4)) {
      setError(t('completeRequiredFieldsError'));
      return;
    }
    
    try {
      // Preparar datos finales, asegurando que categoryIds esté presente
      const { categoryId, ...restFormState } = formState || {};
      const finalData = {
        ...restFormState,
        categoryIds: formState?.categoryIds || (categoryId ? [categoryId] : []),
        ...(attachmentId ? { attachmentId: attachmentId } : {}),
      };
      await onSubmit(finalData);
    } catch (err: any) {
      setError(err.message || 'Error al crear el elemento');
    }
  };

  const getModalIcon = () => {
    const isUserForm = formTemplate.some(field =>
      field.name === 'email' || field.name === 'role'
    );
    if (isUserForm) return 'bi bi-person-plus';
    switch (uploadType) {
      case 'item': return 'bi bi-box-seam';
      case 'product': return 'bi bi-folder-plus';
      default: return 'bi bi-plus-circle';
    }
  };

  const getModalTitle = () => {
    const isUserForm = formTemplate.some(field =>
      field.name === 'email' || field.name === 'role'
    );

    if (isUserForm) {
      return 'Añadir Usuario';
    }

    switch (uploadType) {
      case 'item':
        return 'Crear Nuevo Item';
      case 'product':
        return 'Añadir Categoría';
      default:
        return 'Añadir Elemento';
    }
  };

  const getStepTitle = (step: WizardStep): string => {
    switch (step) {
      case 1:
        return 'Seleccionar Categoría';
      case 2:
        return 'Copiar desde Item Existente';
      case 3:
        return 'Información Básica';
      case 4:
        return 'Campos Específicos';
      default:
        return '';
    }
  };

  const getStepDescription = (step: WizardStep): string => {
    switch (step) {
      case 1:
        return 'Elige la categoría para tu nuevo item';
      case 2:
        return 'Opcionalmente, puedes copiar datos de un item existente de la misma categoría';
      case 3:
        return 'Completa la información básica del item';
      case 4:
        return 'Configura los campos específicos de la categoría seleccionada';
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderCategoryStep();
      case 2:
        return renderCopyStep();
      case 3:
        return renderBasicFieldsStep();
      case 4:
        return renderSpecificFieldsStep();
      default:
        return null;
    }
  };

  const renderCategoryStep = () => {
    return (
      <Form.Group className="mb-3">
        <Form.Label>
          Categorías
          <span className="text-muted ms-1">(opcional)</span>
        </Form.Label>
        <CategoryTagsInput
          value={formState?.categoryIds || []}
          onChange={(categoryIds) => {
            setFormState({ ...(formState || {}), categoryIds });
            if (onCategoryChange && categoryIds.length > 0) {
              onCategoryChange(categoryIds[0]);
            } else if (onCategoryChange) {
              onCategoryChange(null);
            }
          }}
          placeholder="Añadir categorías..."
        />
        <Form.Text className="text-muted mt-2 d-block">
          Puedes añadir una o más categorías para etiquetar este item. Las categorías se crearán automáticamente si no existen.
        </Form.Text>
      </Form.Group>
    );
  };

  const renderCopyStep = () => {
    const categoryIds = formState?.categoryIds || [];
    if (categoryIds.length === 0) {
      return (
        <Alert variant="info">
          Puedes añadir categorías en el paso anterior para copiar datos de items existentes, o continuar sin categorías.
        </Alert>
      );
    }

    return (
      <div>
        <Alert variant="info" className="mb-3">
          <strong>¿Quieres copiar datos de un item existente?</strong>
          <br />
          Esto copiará automáticamente el nombre, descripción, imagen y campos específicos del item seleccionado.
          Tu ID personalizado se mantendrá.
        </Alert>
        
        <Form.Group className="mb-3">
          <Form.Label>Copiar campos de</Form.Label>
          <Form.Select
            value={selectedCopyItemId}
            onChange={(e) => {
              const selectedId = e.target.value;
              setSelectedCopyItemId(selectedId);
              if (!selectedId) {
                setFormState({
                  categoryId: formState?.categoryId || '',
                  customId: formState?.customId || ''
                });
                return;
              }
              handleCopyFromItem(selectedId);
            }}
            disabled={isLoadingCategoryItems}
            size="lg"
          >
            <option value="">{isLoadingCategoryItems ? 'Cargando items…' : 'No copiar - crear desde cero'}</option>
            {categoryItems.map((it) => (
              <option key={it.id} value={it.id}>{it.name || it.id}</option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {selectedCopyItemId ? 'Los datos se han copiado. Puedes modificarlos en los siguientes pasos.' : 'Continuarás con un formulario vacío.'}
          </Form.Text>
        </Form.Group>

        {selectedCopyItemId && (
          <Alert variant="success">
            <strong>✓ Datos copiados</strong>
            <br />
            Los campos se han rellenado automáticamente. Puedes revisarlos y modificarlos en los siguientes pasos.
          </Alert>
        )}
      </div>
    );
  };

  const tForms = useTranslations('forms');
  const renderBasicFieldsStep = () => {
    const basicFields = ['customId', 'name', 'description', 'imageUrl'];
    
    return (
      <div>
        {basicFields.map(fieldName => {
          const field = formTemplate.find(f => f.name === fieldName);
          if (!field) return null;
          
          if (field.type === 'image') {
            return (
              <WizardImageField
                key={field.name}
                name={field.name}
                label={field.label}
                value={formState?.[field.name]}
                onChange={(value) => setFormState({ ...(formState || {}), [field.name]: value })}
                uploadType={uploadType}
                required={field.required}
                compact={true}
              />
            );
          }

          return (
            <Form.Group className="mb-3" key={field.name}>
              <Form.Label>
                {field.label}
                {field.required && <span className="text-danger ms-1">*</span>}
              </Form.Label>
              {field.type === 'textarea' ? (
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder={field.placeholder}
                  value={formState?.[field.name] || ''}
                  onChange={(e) => setFormState({ ...(formState || {}), [field.name]: e.target.value })}
                  required={field.required}
                  size="lg"
                />
              ) : (
                <Form.Control
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formState?.[field.name] || ''}
                  onChange={(e) => setFormState({ ...(formState || {}), [field.name]: e.target.value })}
                  required={field.required}
                  size="lg"
                />
              )}
              {field.name === 'customId' && (
                <Form.Text className="text-muted">
                  {tForms('customIdHelp')}
                </Form.Text>
              )}
            </Form.Group>
          );
        })}
      </div>
    );
  };

  const renderSpecificFieldsStep = () => {
    const specificFields = formTemplate.filter(field => 
      field.name !== 'customId' && 
      field.name !== 'name' && 
      field.name !== 'description' && 
      field.name !== 'imageUrl' && 
      field.name !== 'categoryId' &&
      field.name !== 'categoryIds'
    );

    if (specificFields.length === 0) {
      return (
        <Alert variant="info">
          Esta categoría no tiene campos específicos adicionales.
        </Alert>
      );
    }

    return (
      <div>
        {specificFields.map((field) => {
          if (field.type === 'image') {
            return (
              <WizardImageField
                key={field.name}
                name={field.name}
                label={field.label}
                value={formState?.[field.name]}
                onChange={(value) => setFormState({ ...(formState || {}), [field.name]: value })}
                uploadType={uploadType}
                required={field.required}
                compact={true}
              />
            );
          }

          if (field.type === 'select') {
            return (
              <Form.Group className="mb-3" key={field.name}>
                <Form.Label>
                  {field.label}
                  {field.required && <span className="text-danger ms-1">*</span>}
                </Form.Label>
                <Form.Select
                  value={formState?.[field.name] || ''}
                  onChange={(e) => setFormState({ ...(formState || {}), [field.name]: e.target.value })}
                  required={field.required}
                  size="lg"
                >
                  <option value="">{field.placeholder || 'Seleccionar...'}</option>
                  {field.options?.map((option: any, index: number) => (
                    <option key={`${field.name}-option-${option.value || index}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            );
          }

          return (
            <Form.Group className="mb-3" key={field.name}>
              <Form.Label>
                {field.label}
                {field.required && <span className="text-danger ms-1">*</span>}
              </Form.Label>
              {field.type === 'textarea' ? (
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder={field.placeholder}
                  value={formState?.[field.name] || ''}
                  onChange={(e) => setFormState({ ...(formState || {}), [field.name]: e.target.value })}
                  required={field.required}
                  size="lg"
                />
              ) : (
                <Form.Control
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formState?.[field.name] || ''}
                  onChange={(e) => setFormState({ ...(formState || {}), [field.name]: e.target.value })}
                  required={field.required}
                  size="lg"
                />
              )}
            </Form.Group>
          );
        })}

        {customFormContent && (
          <>
            <hr className="my-3" />
            {customFormContent}
          </>
        )}

      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={getModalIcon()}></i>
          <span>
          {getModalTitle()}
          <small className="text-muted d-block mt-1">
            Paso {currentStep} de 4: {getStepTitle(currentStep)}
          </small>
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <div className="progress mb-3" style={{ height: '8px' }}>
            <div 
              className="progress-bar bg-primary" 
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
          <p className="text-muted mb-0">{getStepDescription(currentStep)}</p>
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        {currentStep > 1 && (
          <Button variant="outline-primary" onClick={handlePrevious}>
            Anterior
          </Button>
        )}
        {currentStep < 4 ? (
          <Button variant="primary" onClick={handleNext}>
            Siguiente
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmit}>
            Crear Item
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
