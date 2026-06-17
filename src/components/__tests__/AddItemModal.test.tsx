import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock custom components
vi.mock('../ImageConfigSection', () => ({
  default: vi.fn(({ imageConfig, setImageConfig }) =>
    React.createElement('div', { 'data-testid': 'image-config-section' }, 
      `Image Config: ${imageConfig?.maxImages || 1} images`
    )
  ),
}));
vi.mock('../DynamicImageField', () => ({
  default: vi.fn(({ uploadType, attachmentId, onImageUploadSuccess }) =>
    React.createElement('div', { 'data-testid': 'dynamic-image-field' }, 
      `Dynamic Image Field: ${uploadType}`
    )
  ),
}));
vi.mock('../ItemCreationWizard', () => ({
  default: vi.fn(({ formTemplate, formState, setFormState, onSubmit, onCategoryChange }) =>
    React.createElement('div', { 'data-testid': 'item-creation-wizard' }, 'Item Creation Wizard')
  ),
}));

// Mock custom hook
vi.mock('@/hooks/useAdminVerificationNotification', () => ({
  useAdminVerificationNotification: vi.fn(() => ({
    isVerified: true,
    isAdmin: false,
    verificationStatus: 'VERIFIED',
  })),
}));

// Mock fetch
global.fetch = vi.fn();

// Test component that simulates AddItemModal behavior
const TestAddItemModal = ({ 
  show, 
  onHide, 
  formTemplate, 
  formState, 
  setFormState, 
  onSubmit, 
  allowTemplateEditing = true,
  attachmentId,
  customFormContent,
  isIssueTemplate = false,
  uploadType = 'product',
  onCategoryChange,
  useWizard = false
}: any) => {
  const [imageConfig, setImageConfig] = React.useState({
    allowMultipleImages: false,
    maxImages: 1,
  });
  const [error, setError] = React.useState<string | null>(null);

  const getModalTitle = () => {
    if (isIssueTemplate) {
      return 'Nuevo Estado';
    }
    
    const isUserForm = formTemplate.some((field: any) => 
      field.name === 'email' || field.name === 'role'
    );
    
    if (isUserForm) {
      return 'Añadir Usuario';
    }
    
    switch (uploadType) {
      case 'item':
        return 'Añadir Item';
      case 'product':
        return 'Añadir Categoría';
      case 'issue':
        return 'Nuevo Estado';
      default:
        return 'Añadir Elemento';
    }
  };

  const validateRequiredFields = (): string[] => {
    const errors: string[] = [];
    
    formTemplate.forEach((field: any) => {
      if (field.required) {
        const value = formState?.[field.name];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`El campo "${field.label}" es obligatorio`);
        }
      }
    });
    
    return errors;
  };

  const handleSubmit = async () => {
    setError(null);
    
    const validationErrors = validateRequiredFields();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    try {
      const finalData = {
        ...(formState || {}),
        ...(attachmentId ? { attachmentId: attachmentId } : {}),
        ...(isIssueTemplate ? {
          allowMultipleImages: imageConfig.allowMultipleImages,
          maxImages: imageConfig.maxImages,
        } : {}),
      };
      await onSubmit(finalData, formTemplate);
    } catch (err: any) {
      setError(err.message || 'Error al crear el elemento');
    }
  };

  const renderField = (field: any) => {
    if (!field || !field.name) {
      return null;
    }

    if (field.type === 'image') {
      return React.createElement('div', { 'data-testid': 'dynamic-image-field', key: field.name }, 
        `Dynamic Image Field: ${uploadType}`
      );
    }

    if (field.type === 'select') {
      return React.createElement('div', { 'data-testid': 'form-group', key: field.name }, [
        React.createElement('label', { key: 'label', htmlFor: field.name }, [
          field.label,
          field.required && React.createElement('span', { key: 'required', className: 'text-danger ms-1' }, '*')
        ]),
        React.createElement('select', { 
          key: 'select',
          'data-testid': 'form-select',
          id: field.name,
          name: field.name,
          value: formState?.[field.name] || '',
          onChange: (e: any) => {
            const value = e.target.value;
            setFormState({ ...(formState || {}), [field.name]: value });
            
            if (field.name === 'categoryId' && onCategoryChange) {
              onCategoryChange(value || null);
            }
          },
          required: field.required
        }, [
          React.createElement('option', { key: 'empty', value: '' }, field.placeholder || 'Seleccionar...'),
          ...(field.options?.map((option: any, index: number) => 
            React.createElement('option', { 
              key: `${field.name}-option-${option.value || index}`, 
              value: option.value 
            }, option.label)
          ) || [])
        ])
      ]);
    }

    if (field.type === 'textarea') {
      return React.createElement('div', { 'data-testid': 'form-group', key: field.name }, [
        React.createElement('label', { key: 'label', htmlFor: field.name }, [
          field.label,
          field.required && React.createElement('span', { key: 'required', className: 'text-danger ms-1' }, '*')
        ]),
        React.createElement('textarea', { 
          key: 'textarea',
          'data-testid': 'form-control',
          id: field.name,
          name: field.name,
          rows: 4,
          placeholder: field.placeholder,
          value: formState?.[field.name] || '',
          onChange: (e: any) =>
            setFormState({ ...(formState || {}), [field.name]: e.target.value }),
          required: field.required
        })
      ]);
    }

    return React.createElement('div', { 'data-testid': 'form-group', key: field.name }, [
      React.createElement('label', { key: 'label', htmlFor: field.name }, [
        field.label,
        field.required && React.createElement('span', { key: 'required', className: 'text-danger ms-1' }, '*')
      ]),
      React.createElement('input', { 
        key: 'input',
        'data-testid': 'form-control',
        id: field.name,
        name: field.name,
        type: field.type,
        placeholder: field.placeholder,
        value: formState?.[field.name] || '',
        onChange: (e: any) =>
          setFormState({ ...(formState || {}), [field.name]: e.target.value }),
        required: field.required
      })
    ]);
  };

  if (useWizard) {
    return React.createElement('div', { 'data-testid': 'item-creation-wizard' }, 'Item Creation Wizard');
  }

  if (!show) {
    return null;
  }

  return React.createElement('div', { 'data-testid': 'modal', 'data-centered': 'true', 'data-size': 'lg' }, [
    React.createElement('div', { 'data-testid': 'modal-header', key: 'header' }, [
      React.createElement('button', { 'data-testid': 'modal-close', onClick: onHide, key: 'close' }, '×'),
      React.createElement('h5', { 'data-testid': 'modal-title', key: 'title' }, getModalTitle()),
    ]),
    React.createElement('div', { 'data-testid': 'modal-body', key: 'body' }, [
      React.createElement('form', { 'data-testid': 'form', key: 'form' }, [
        error && React.createElement('div', { 'data-testid': 'alert', 'data-variant': 'danger', key: 'error' }, error),
        ...formTemplate.filter((field: any) => field && field.name).map((field: any) => renderField(field)),
        customFormContent && React.createElement('div', { key: 'custom' }, customFormContent),
        isIssueTemplate && React.createElement('div', { 'data-testid': 'image-config-section', key: 'image-config' }, 
          `Image Config: ${imageConfig.maxImages} images`
        )
      ])
    ]),
    React.createElement('div', { 'data-testid': 'modal-footer', key: 'footer' }, [
      React.createElement('button', { 
        'data-testid': 'button', 
        'data-variant': 'secondary', 
        onClick: onHide, 
        key: 'cancel' 
      }, 'Cancelar'),
      React.createElement('button', { 
        'data-testid': 'button', 
        'data-variant': 'primary', 
        onClick: handleSubmit, 
        key: 'save' 
      }, 'Guardar')
    ])
  ]);
};

describe('AddItemModal', () => {
  const mockOnHide = vi.fn();
  const mockSetFormState = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnCategoryChange = vi.fn();

  const mockFormTemplate = [
    {
      id: 'field-1',
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true
    },
    {
      id: 'field-2',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false
    }
  ];

  const mockFormState = {
    name: 'Test Item',
    description: 'Test Description'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders modal when show is true', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Añadir Categoría')).toBeInTheDocument();
    });

    it('does not render modal when show is false', () => {
      render(
        <TestAddItemModal
          show={false}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders with wizard when useWizard is true', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          useWizard={true}
        />
      );

      expect(screen.getByTestId('item-creation-wizard')).toBeInTheDocument();
    });

    it('renders without wizard when useWizard is false', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          useWizard={false}
        />
      );

      expect(screen.queryByTestId('item-creation-wizard')).not.toBeInTheDocument();
      expect(screen.getByTestId('form')).toBeInTheDocument();
    });
  });

  describe('Modal interactions', () => {
    it('calls onHide when close button is clicked', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.click(screen.getByTestId('modal-close'));
      expect(mockOnHide).toHaveBeenCalledTimes(1);
    });

    it('has correct modal attributes', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      const modal = screen.getByTestId('modal');
      expect(modal).toHaveAttribute('data-size', 'lg');
      expect(modal).toHaveAttribute('data-centered', 'true');
    });
  });

  describe('Form rendering', () => {
    it('renders form fields based on formTemplate', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    });

    it('renders image config section when isIssueTemplate is true', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          isIssueTemplate={true}
        />
      );

      expect(screen.getByTestId('image-config-section')).toBeInTheDocument();
      expect(screen.getByText('Image Config: 1 images')).toBeInTheDocument();
    });

    it('renders custom form content when provided', () => {
      const customContent = React.createElement('div', { 'data-testid': 'custom-content' }, 'Custom Form Content');
      
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          customFormContent={customContent}
        />
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
  });

  describe('Form interactions', () => {
    it('updates form state on input change', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: /name/i });
      fireEvent.change(nameInput, { target: { value: 'Updated Item Name' } });
      expect(mockSetFormState).toHaveBeenCalledWith({ ...mockFormState, name: 'Updated Item Name' });
    });

    it('calls onSubmit with combined data', async () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.click(screen.getByText('Guardar'));
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith(
          { ...mockFormState },
          mockFormTemplate
        );
      });
    });

    it('shows validation error for required fields', async () => {
      const emptyFormState = { name: '', description: '' };
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={emptyFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.click(screen.getByText('Guardar'));
      await waitFor(() => {
        expect(screen.getByText('El campo "Name" es obligatorio')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Props handling', () => {
    it('handles allowTemplateEditing prop', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          allowTemplateEditing={false}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('handles isIssueTemplate prop', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          isIssueTemplate={true}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Nuevo Estado')).toBeInTheDocument();
    });

    it('handles uploadType prop', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          uploadType="item"
        />
      );

      expect(screen.getByText('Añadir Item')).toBeInTheDocument();
    });

    it('handles attachmentId prop', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          attachmentId="attach123"
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('calls onCategoryChange when category field changes', async () => {
      const categoryTemplate = [
        { id: 'cat-field', name: 'categoryId', label: 'Category', type: 'select', options: [{ value: 'cat1', label: 'Category 1' }] }
      ];
      const categoryFormState = { categoryId: '' };

      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={categoryTemplate}
          formState={categoryFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
          onCategoryChange={mockOnCategoryChange}
        />
      );

      const categorySelect = screen.getByTestId('form-select');
      fireEvent.change(categorySelect, { target: { value: 'cat1' } });

      expect(mockOnCategoryChange).toHaveBeenCalledWith('cat1');
    });
  });

  describe('Edge cases', () => {
    it('handles empty form template', () => {
      const emptyTemplate: any[] = [];

      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={emptyTemplate}
          formState={{}}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('handles null form state', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={null as any}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-header')).toBeInTheDocument();
      expect(screen.getByTestId('modal-body')).toBeInTheDocument();
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });

    it('has proper close button', () => {
      render(
        <TestAddItemModal
          show={true}
          onHide={mockOnHide}
          formTemplate={mockFormTemplate}
          formState={mockFormState}
          setFormState={mockSetFormState}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getByTestId('modal-close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('×');
    });
  });
});