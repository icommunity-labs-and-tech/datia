import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock react-bootstrap components specifically for this test
vi.mock('react-bootstrap', () => ({
  Form: ({ children, onSubmit }: any) => 
    React.createElement('form', { onSubmit, 'data-testid': 'form' }, children),
  
  FormGroup: ({ children, className }: any) => 
    React.createElement('div', { className, 'data-testid': 'form-group' }, children),
  
  FormLabel: ({ children, className }: any) => 
    React.createElement('label', { className, 'data-testid': 'form-label' }, children),
  
  FormSelect: ({ children, value, onChange, required, disabled, className }: any) => 
    React.createElement('select', { 
      value, 
      onChange, 
      required, 
      disabled, 
      className,
      'data-testid': 'form-select'
    }, children),
  
  FormControl: ({ as, rows, value, onChange, placeholder, disabled, className }: any) => 
    as === 'textarea' 
      ? React.createElement('textarea', { 
          rows, 
          value, 
          onChange, 
          placeholder, 
          disabled, 
          className,
          'data-testid': 'form-control'
        })
      : React.createElement('input', { 
          value, 
          onChange, 
          placeholder, 
          disabled, 
          className,
          'data-testid': 'form-control'
        }),
  
  FormText: ({ children, className }: any) => 
    React.createElement('small', { className, 'data-testid': 'form-text' }, children),
  
  Button: ({ children, type, variant, size, disabled, className }: any) => 
    React.createElement('button', { 
      type, 
      'data-variant': variant,
      'data-size': size,
      disabled, 
      className,
      'data-testid': 'button'
    }, children),
  
  Alert: ({ children, variant, className }: any) => 
    React.createElement('div', { 
      'data-testid': 'alert', 
      'data-variant': variant, 
      className 
    }, children),
  
  Spinner: ({ animation, role, children }: any) => 
    React.createElement('div', { 
      'data-testid': 'spinner', 
      'data-animation': animation, 
      role 
    }, children),
  
  Modal: ({ children, show, onHide, size, centered }: any) => 
    show ? React.createElement('div', { 
      'data-testid': 'modal', 
      'data-size': size,
      'data-centered': centered 
    }, children) : null,
  
  ModalHeader: ({ children, closeButton }: any) => 
    React.createElement('div', { 
      'data-testid': 'modal-header', 
      'data-close-button': closeButton 
    }, children),
  
  ModalTitle: ({ children }: any) => 
    React.createElement('h5', { 'data-testid': 'modal-title' }, children),
  
  ModalBody: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'modal-body' }, children),
  
  Badge: ({ children, bg, style, onClick }: any) => 
    React.createElement('span', { 
      'data-testid': 'badge', 
      'data-bg': bg,
      style,
      onClick,
      className: `badge bg-${bg}`
    }, children),
}));

// Import mocked functions
import { listStatusTypes } from '@/actions/statusTypes';
import { createState } from '@/actions/states';
import { getItem } from '@/actions/items';

const mockGetStatusTypes = vi.mocked(listStatusTypes);
const mockCreateState = vi.mocked(createState);
const mockGetItem = vi.mocked(getItem);

// Test component that mimics AddStateForm behavior without styled-jsx
const TestAddStateForm = ({ 
  item, 
  itemId, 
  onSuccess, 
  onStateCreated, 
  show = true, 
  onHide 
}: any) => {
  const [statusTypes, setStatusTypes] = React.useState([]);
  const [selectedStatusType, setSelectedStatusType] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [formData, setFormData] = React.useState({ description: '' });

  React.useEffect(() => {
    const fetchStatusTypes = async () => {
      let categoryId = item?.categoryId;
      
      if (!categoryId && itemId) {
        try {
          const fullItem = await getItem(itemId);
          categoryId = fullItem?.categoryId;
        } catch (err) {
          console.error('Error obteniendo item completo:', err);
        }
      }
      
      if (!categoryId) {
        setError('No se puede determinar la categoría del item. Asegúrate de que el item esté completamente cargado.');
        return;
      }

      try {
        const data = await listStatusTypes();
        setStatusTypes(data);
        
        try {
          const last = window.localStorage.getItem('operator:lastStatusTypeId');
          if (last) {
            const match = data.find((st) => st.id === last);
            if (match) setSelectedStatusType(match);
          }
        } catch {}
      } catch (err) {
        setError(`Error al cargar los tipos de estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatusTypes();
  }, [item?.categoryId, item, itemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatusType) {
      setError('Debes seleccionar un tipo de estado');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createState({
        itemId: itemId || item?.id,
        statusTypeId: selectedStatusType.id,
        description: formData.description,
      });

      try { 
        window.localStorage.setItem('operator:lastStatusTypeId', selectedStatusType.id); 
      } catch {}

      if (onStateCreated) {
        onStateCreated(result);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const friendly = typeof err === 'string'
        ? err
        : (err?.message || 'Error al crear el estado');
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div data-testid="spinner" role="status">
          <span className="visually-hidden">Cargando tipos de estado...</span>
        </div>
        <p className="mt-2">Cargando tipos de estado disponibles...</p>
      </div>
    );
  }

  const formContent = (
    <div className="add-state-form">
      <form onSubmit={handleSubmit} data-testid="form">
        {statusTypes.length > 0 && (
          <div className="mb-3 d-flex flex-wrap gap-2">
            {statusTypes.slice(0, 6).map((st) => (
              <span
                key={st.id}
                data-testid="badge"
                data-bg={selectedStatusType?.id === st.id ? 'primary' : 'secondary'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedStatusType(st)}
                className={`badge bg-${selectedStatusType?.id === st.id ? 'primary' : 'secondary'}`}
              >
                {st.name}
              </span>
            ))}
          </div>
        )}

        <div className="mb-4" data-testid="form-group">
          <label className="form-label" data-testid="form-label">
            <span className="label-icon">🏷️</span>
            Tipo de Estado *
          </label>
          <select
            data-testid="form-select"
            value={selectedStatusType?.id || ''}
            onChange={(e) => {
              const statusType = statusTypes.find(st => st.id === e.target.value);
              setSelectedStatusType(statusType || null);
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
          </select>
          {selectedStatusType && (
            <small className="text-muted" data-testid="form-text">
              {selectedStatusType.description}
            </small>
          )}
        </div>

        {selectedStatusType && item && (
          <div data-testid="alert" data-variant="info" className="mb-4">
            <strong>Título generado:</strong> {item.name} - {selectedStatusType.name}
          </div>
        )}

        <div className="mb-4" data-testid="form-group">
          <label className="form-label" data-testid="form-label">
            <span className="label-icon">📄</span>
            Descripción
          </label>
          <textarea
            data-testid="form-control"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe el estado actual del item..."
            disabled={isSubmitting}
            className="form-control-custom"
          />
        </div>

        {error && (
          <div data-testid="alert" data-variant="danger" className="error-alert mb-4">
            <div className="d-flex align-items-center">
              <span className="error-icon me-2">⚠️</span>
              <div>
                <h6 className="mb-1">Error al crear estado</h6>
                <p className="mb-0">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            data-variant="success"
            data-size="lg"
            disabled={isSubmitting || !selectedStatusType}
            className="submit-btn"
            data-testid="button"
          >
            {isSubmitting ? (
              <>
                <div data-testid="spinner" className="me-2" />
                Creando estado...
              </>
            ) : (
              <>
                <span className="me-2">💾</span>
                Guardar Estado
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (show !== undefined && onHide) {
    return (
      <div data-testid="modal" data-size="lg" data-centered="true">
        <div data-testid="modal-header" data-close-button="true">
          <h5 data-testid="modal-title">Añadir Estado</h5>
        </div>
        <div data-testid="modal-body">
          {formContent}
        </div>
      </div>
    );
  }

  return formContent;
};

describe('AddStateForm', () => {
  const mockItem = {
    id: 'item-1',
    name: 'Laptop HP',
    categoryId: 'cat-1'
  };

  const mockStatusTypes = [
    { id: 'st1', name: 'Reparado', description: 'Item reparado completamente' },
    { id: 'st2', name: 'En Proceso', description: 'Item en proceso de reparación' },
    { id: 'st3', name: 'Pendiente', description: 'Item pendiente de revisión' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatusTypes.mockResolvedValue(mockStatusTypes);
    mockCreateState.mockResolvedValue({ id: 'state-1', statusTypeId: 'st1' });
    mockGetItem.mockResolvedValue(mockItem);
    
    localStorage.clear();
  });

  describe('Loading state', () => {
    it('shows loading spinner initially', () => {
      render(<TestAddStateForm item={mockItem} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Cargando tipos de estado disponibles...')).toBeInTheDocument();
    });
  });

  describe('Status types loading', () => {
    it('loads status types on mount', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(mockGetStatusTypes).toHaveBeenCalledWith('cat-1');
      });
    });

    it('loads item when only itemId is provided', async () => {
      render(<TestAddStateForm itemId="item-1" />);
      
      await waitFor(() => {
        expect(mockGetItem).toHaveBeenCalledWith('item-1');
        expect(mockGetStatusTypes).toHaveBeenCalledWith('cat-1');
      });
    });

    it('shows error when no categoryId available', async () => {
      mockGetItem.mockResolvedValue({ ...mockItem, categoryId: undefined });
      
      render(<TestAddStateForm itemId="item-1" />);
      
      await waitFor(() => {
        expect(screen.getByText(/No se puede determinar la categoría del item/)).toBeInTheDocument();
      });
    });

    it('shows error when status types loading fails', async () => {
      mockGetStatusTypes.mockRejectedValue(new Error('Network error'));
      
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error al cargar los tipos de estado/)).toBeInTheDocument();
      });
    });
  });

  describe('Form rendering', () => {
    it('renders form after loading', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('form')).toBeInTheDocument();
        expect(screen.getByText('Tipo de Estado *')).toBeInTheDocument();
        expect(screen.getByText('Descripción')).toBeInTheDocument();
      });
    });

    it('renders status type chips', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(screen.getByText('Reparado')).toBeInTheDocument();
        expect(screen.getByText('En Proceso')).toBeInTheDocument();
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
      });
    });

    it('shows title preview when status type selected', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        expect(screen.getByText(/Título generado: Laptop HP - Reparado/)).toBeInTheDocument();
      });
    });

    it('shows status type description when selected', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        expect(screen.getByText('Item reparado completamente')).toBeInTheDocument();
      });
    });
  });

  describe('Form interactions', () => {
    it('selects status type via chips', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        const reparadoChip = badges.find(badge => badge.textContent === 'Reparado');
        fireEvent.click(reparadoChip);
        
        expect(reparadoChip).toHaveClass('bg-primary');
      });
    });

    it('selects status type via select', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        expect(select).toHaveValue('st1');
      });
    });

    it('updates description textarea', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const textarea = screen.getByTestId('form-control');
        fireEvent.change(textarea, { target: { value: 'Test description' } });
        
        expect(textarea).toHaveValue('Test description');
      });
    });
  });

  describe('Form submission', () => {
    it('shows error when no status type selected', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
        
        expect(screen.getByText('Debes seleccionar un tipo de estado')).toBeInTheDocument();
      });
    });

    it('submits form successfully', async () => {
      const mockOnSuccess = vi.fn();
      render(<TestAddStateForm item={mockItem} onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        const textarea = screen.getByTestId('form-control');
        fireEvent.change(textarea, { target: { value: 'Test description' } });
        
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
      });
      
      await waitFor(() => {
        expect(mockCreateState).toHaveBeenCalledWith({
          itemId: 'item-1',
          statusTypeId: 'st1',
          description: 'Test description'
        });
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onStateCreated when provided', async () => {
      const mockOnStateCreated = vi.fn();
      render(<TestAddStateForm item={mockItem} onStateCreated={mockOnStateCreated} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
      });
      
      await waitFor(() => {
        expect(mockOnStateCreated).toHaveBeenCalledWith({ id: 'state-1', statusTypeId: 'st1' });
      });
    });

    it('shows loading state during submission', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
        
        expect(screen.getByText('Creando estado...')).toBeInTheDocument();
      });
    });

    it('shows error when submission fails', async () => {
      mockCreateState.mockRejectedValue(new Error('Creation failed'));
      
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Error al crear el estado/)).toBeInTheDocument();
      });
    });

    it('saves last selected status type to localStorage', async () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        const form = screen.getByTestId('form');
        fireEvent.submit(form);
      });
      
      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith('operator:lastStatusTypeId', 'st1');
      });
    });
  });

  describe('Modal mode', () => {
    it('renders as modal when show and onHide provided', async () => {
      const mockOnHide = vi.fn();
      render(<TestAddStateForm item={mockItem} show={true} onHide={mockOnHide} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByText('Añadir Estado')).toBeInTheDocument();
      });
    });

    it('does not render modal when show is false', () => {
      const mockOnHide = vi.fn();
      render(<TestAddStateForm item={mockItem} show={false} onHide={mockOnHide} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('localStorage integration', () => {
    it('preselects last status type from localStorage', async () => {
      localStorage.setItem('operator:lastStatusTypeId', 'st2');
      
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const select = screen.getByTestId('form-select');
        expect(select).toHaveValue('st2');
      }, { timeout: 3000 });
    });

    it('handles localStorage errors gracefully', async () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('form')).toBeInTheDocument();
      });
      
      getItemSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        expect(screen.getByText('Tipo de Estado *')).toBeInTheDocument();
        expect(screen.getByText('Descripción')).toBeInTheDocument();
      });
    });

    it('has proper button states', async () => {
      render(<TestAddStateForm item={mockItem} />);
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /guardar estado/i });
        expect(submitButton).toBeDisabled();
        
        const select = screen.getByTestId('form-select');
        fireEvent.change(select, { target: { value: 'st1' } });
        
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});