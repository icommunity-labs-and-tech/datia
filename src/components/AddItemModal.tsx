'use client';

import { Modal } from '@/components/legacy/bootstrap-compat';
import { Button } from '@/components/legacy/bootstrap-compat';
import { Form } from '@/components/legacy/bootstrap-compat';
import { Stack } from '@/components/legacy/bootstrap-compat';
import { useEffect, useState } from 'react';
import type { FormTemplate } from './GenericTable';
import DynamicImageField from './DynamicImageField';
import { Alert } from '@/components/legacy/bootstrap-compat';
import ItemCreationWizard from './ItemCreationWizard';
import { checkEmailExists } from '@/actions/users';
import { useTranslations } from 'next-intl';

type AddItemModalProps = {
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
  useWizard?: boolean; // Nueva prop para activar el wizard
  modalTitle?: string; // Título personalizado para el modal
};

export default function AddItemModal({
  show,
  onHide,
  formTemplate,
  formState,
  setFormState,
  onSubmit,
  allowTemplateEditing = true,
  attachmentId,
  customFormContent,
  uploadType = 'product',
  onCategoryChange,
  useWizard = false,
  modalTitle
}: AddItemModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingCategoryItems, setIsLoadingCategoryItems] = useState(false);
  const [selectedCopyItemId, setSelectedCopyItemId] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const t = useTranslations('modals.addItem');
  const tValidation = useTranslations('common.validation');
  const tCommon = useTranslations('common.actions');
  const tForms = useTranslations('forms');

  // Validación en tiempo real del email para formularios de usuario
  useEffect(() => {
    const isUserForm = formTemplate.some(field => 
      field.name === 'email' || field.name === 'role'
    );
    
    if (!isUserForm || !formState?.email) {
      setEmailError(null);
      return;
    }

    const email = formState.email.trim();
    
    // Validación básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setEmailError(t('emailFormatInvalid'));
      return;
    }

    // Debounce para evitar muchas llamadas al servidor
    const timer = setTimeout(async () => {
      if (email && emailRegex.test(email)) {
        setIsCheckingEmail(true);
        setEmailError(null);
        
        try {
          const result = await checkEmailExists(email);
          if (result.exists) {
            setEmailError(t('emailExists'));
          } else if (result.error) {
            setEmailError(result.error);
          } else {
            setEmailError(null);
          }
        } catch (error) {
          console.error('Error checking email:', error);
          setEmailError(t('emailCheckError'));
        } finally {
          setIsCheckingEmail(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formState?.email, formTemplate]);


  // Función para validar campos requeridos
  const validateRequiredFields = (): string[] => {
    const errors: string[] = [];
    
    formTemplate.forEach((field) => {
      if (field.required) {
        const value = formState?.[field.name];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(t('fieldRequired', { label: field.label }));
        }
      }
    });
    
    return errors;
  };

  // Función para obtener el icono del modal basado en el contexto
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

  // Función para generar el título del modal basado en el contexto
  const getModalTitle = () => {
    // Si se proporciona un título personalizado, usarlo
    if (modalTitle) {
      return modalTitle;
    }

    // Detectar si es un formulario de usuario por los campos específicos
    const isUserForm = formTemplate.some(field =>
      field.name === 'email' || field.name === 'role'
    );

    if (isUserForm) {
      return t('addUser');
    }

    switch (uploadType) {
      case 'item':
        return t('addProduct');
      case 'product':
        return t('addCategory');
      default:
        return t('addElement');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Prevenir envío si hay error de email
    if (emailError) {
      setError(emailError);
      return;
    }
    
    // Validar campos requeridos
    const validationErrors = validateRequiredFields();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    // Validar campos del template (para StatusTypeFieldBuilder)
    if (formState?.template && Array.isArray(formState.template)) {
      const templateErrors: string[] = [];
      formState.template.forEach((field: any, index: number) => {
        if (!field.name || field.name.trim() === '') {
          templateErrors.push(tForms('fieldMustHaveNameWithNumber', { number: index + 1 }));
        }
        if (field.type === 'select' && (!field.options || field.options.length === 0)) {
          const fieldName = field.name || tForms('fieldName') + ` ${index + 1}`;
          templateErrors.push(tForms('selectMustHaveOptions', { name: fieldName }));
        }
      });
      if (templateErrors.length > 0) {
        setError(templateErrors.join(', '));
        return;
      }
    }
    
    try {
      const finalData = {
        ...(formState || {}),
        ...(attachmentId ? { attachmentId: attachmentId } : {}),
      };
      await onSubmit(finalData);
    } catch (err: any) {
      setError(err.message || t('addItem.createError'));
    }
  };

  // Cargar items de la categoría seleccionada para el desplegable de copia
  useEffect(() => {
    const categoryId = formState?.categoryId;
    if (!categoryId) {
      setCategoryItems([]);
      setSelectedCopyItemId('');
      return;
    }
    const load = async () => {
      try {
        setIsLoadingCategoryItems(true);
        const res = await fetch(`/api/items/by-category?categoryId=${encodeURIComponent(categoryId)}`);
        if (!res.ok) throw new Error(t('loadCategoryError'));
        const data = await res.json();
        setCategoryItems((data || []).map((i: any) => ({ id: i.id, name: i.name })));
        // Resetear selección al cambiar de categoría
        setSelectedCopyItemId('');
      } catch (e) {
        setCategoryItems([]);
      } finally {
        setIsLoadingCategoryItems(false);
      }
    };
    load();
  }, [formState?.categoryId]);

  const handleCopyFromItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`);
      if (!res.ok) throw new Error(t('loadItemError'));
      const item = await res.json();

      // Preservar el customId que el usuario haya escrito
      const preservedCustomId = formState?.customId || '';

      // Construir nuevo estado combinando datos del item
      const merged: Record<string, any> = {
        ...(formState || {}),
        name: item.name || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        categoryId: item.categoryId || '',
        ...(item.templateFields || {}),
      };

      // Restaurar customId
      merged.customId = preservedCustomId;

      setFormState(merged);

      // Si cambia la categoría, disparar onCategoryChange
      if (onCategoryChange && item.categoryId && item.categoryId !== formState?.categoryId) {
        onCategoryChange(item.categoryId);
      }
    } catch (e: any) {
      setError(e?.message || 'Error copiando datos del producto');
    }
  };

  const renderField = (field: any) => {
    // Validar que field existe y tiene las propiedades necesarias
    if (!field || !field.name) {
      console.warn('Invalid field in formTemplate:', field);
      return null;
    }

    if (field.type === 'image') {
      return (
        <DynamicImageField
          key={field.name}
          name={field.name}
          label={field.label}
          value={formState?.[field.name]}
          onChange={(value) => setFormState({ ...(formState || {}), [field.name]: value })}
          uploadType={uploadType}
          required={field.required}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Form.Group className="mb-3" controlId={field.name} key={field.name}>
          <Form.Label>
            {field.label}
            {field.required && <span className="text-danger ms-1">*</span>}
          </Form.Label>
          <Form.Select
            name={field.name}
            value={formState?.[field.name] || ''}
            onChange={(e) => {
              const value = e.target.value;
              setFormState({ ...(formState || {}), [field.name]: value });
              
              // Si es el campo categoryId, llamar a onCategoryChange
              if (field.name === 'categoryId' && onCategoryChange) {
                onCategoryChange(value || null);
              }
            }}
            required={field.required}
          >
            <option value="">{field.placeholder || 'Seleccionar...'}</option>
            {field.options?.map((option: any, index: number) => (
              <option key={`${field.name}-option-${option.value || index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
          {field.name === 'categoryId' && formState?.categoryId && (
            <div className="mt-2">
              <Form.Label className="mb-1">Copiar campos de</Form.Label>
              <Form.Select
                value={selectedCopyItemId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setSelectedCopyItemId(selectedId);
                  if (!selectedId) {
                    // Limpiar todo menos categoryId/customId para evitar residuos (incluye arrays como imageUrls)
                    setFormState({
                      categoryId: formState?.categoryId || '',
                      customId: formState?.customId || ''
                    });
                    return;
                  }
                  handleCopyFromItem(selectedId);
                }}
                disabled={isLoadingCategoryItems}
              >
                <option value="">{isLoadingCategoryItems ? t('loadingProducts') : t('dontCopy')}</option>
                {categoryItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.name || it.id}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">{t('copyHelp')}</Form.Text>
            </div>
          )}
        </Form.Group>
      );
    }

    // Campo especial para ID personalizado
    if (field.name === 'customId') {
      return (
        <Form.Group className="mb-3" controlId={field.name} key={field.name}>
          <Form.Label>{field.label}</Form.Label>
          <Form.Control
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            required
            value={formState?.[field.name] || ''}
            onChange={(e) =>
              setFormState({ ...(formState || {}), [field.name]: e.target.value })
            }
          />
          <Form.Text className="text-muted">
            {t('customIdHelp')}
          </Form.Text>
        </Form.Group>
      );
    }

    // Campo textarea para texto largo
    if (field.type === 'textarea') {
      return (
        <Form.Group className="mb-3" controlId={field.name} key={field.name}>
          <Form.Label>
            {field.label}
            {field.required && <span className="text-danger ms-1">*</span>}
          </Form.Label>
          <Form.Control
            name={field.name}
            as="textarea"
            rows={4}
            placeholder={field.placeholder}
            value={formState?.[field.name] || ''}
            onChange={(e) =>
              setFormState({ ...(formState || {}), [field.name]: e.target.value })
            }
            required={field.required}
          />
        </Form.Group>
      );
    }

    // Validación especial para campo email en formularios de usuario
    const isUserForm = formTemplate.some(f => f.name === 'email' || f.name === 'role');
    const isEmailField = field.name === 'email' && isUserForm;

    return (
      <Form.Group className="mb-3" controlId={field.name} key={field.name}>
        <Form.Label>
          {field.label}
          {field.required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
        <div className="position-relative">
          <Form.Control
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            value={formState?.[field.name] || ''}
            onChange={(e) =>
              setFormState({ ...(formState || {}), [field.name]: e.target.value })
            }
            required={field.required}
            isInvalid={isEmailField && !!emailError}
            isValid={isEmailField && formState?.[field.name] && !emailError && !isCheckingEmail}
          />
          {isEmailField && isCheckingEmail && (
            <div className="position-absolute top-50 end-0 translate-middle-y me-2">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">{tValidation('checking')}</span>
              </div>
            </div>
          )}
          {isEmailField && emailError && (
            <Form.Control.Feedback type="invalid">
              {emailError}
            </Form.Control.Feedback>
          )}
          {isEmailField && formState?.[field.name] && !emailError && !isCheckingEmail && (
            <Form.Control.Feedback type="valid">
              {tValidation('emailAvailable')}
            </Form.Control.Feedback>
          )}
        </div>
      </Form.Group>
    );
  };

  // Si useWizard es true, renderizar el wizard en lugar del modal tradicional
  if (useWizard) {
    return (
      <ItemCreationWizard
        show={show}
        onHide={onHide}
        formTemplate={formTemplate}
        formState={formState}
        setFormState={setFormState}
        onSubmit={onSubmit}
        allowTemplateEditing={allowTemplateEditing}
        attachmentId={attachmentId}
        customFormContent={customFormContent}
        uploadType={uploadType}
        onCategoryChange={onCategoryChange}
      />
    );
  }

  // Modal tradicional (comportamiento por defecto)
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title><i className={getModalIcon()}></i>{getModalTitle()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          
          {formTemplate.filter(field => field && field.name).map((field) => renderField(field))}

          {customFormContent && (
            <>
              {customFormContent}
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {tCommon('cancel')}
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={isCheckingEmail || !!emailError}
        >
          {isCheckingEmail ? t('checkingEmail') : 
           emailError ? t('fixErrors') : 
           tCommon('save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
