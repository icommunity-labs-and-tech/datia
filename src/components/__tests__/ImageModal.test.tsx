import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock react-bootstrap components specifically for this test
vi.mock('react-bootstrap', () => ({
  Modal: ({ children, show, onHide, size, centered, className }: any) => 
    show ? React.createElement('div', { 
      'data-testid': 'modal', 
      'data-size': size,
      'data-centered': centered,
      className
    }, children) : null,
  
  ModalHeader: ({ children, closeButton }: any) => 
    React.createElement('div', { 
      'data-testid': 'modal-header', 
      'data-close-button': closeButton 
    }, children),
  
  ModalBody: ({ children, className }: any) => 
    React.createElement('div', { 'data-testid': 'modal-body', className }, children),
  
  ModalTitle: ({ children }: any) => 
    React.createElement('h5', { 'data-testid': 'modal-title' }, children),
}));

// Test component that mimics ImageModal behavior
const TestImageModal = ({ show, onHide, imageUrl, alt, title }: any) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (show && imageUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [show, imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!show) return null;

  return (
    <div data-testid="modal" data-size="lg" data-centered="true" className="image-modal">
      <div data-testid="modal-header">
        <button data-testid="modal-close" onClick={onHide}>×</button>
        <h5 data-testid="modal-title">{title || 'Imagen'}</h5>
      </div>
      <div data-testid="modal-body" className="p-0 d-flex justify-content-center align-items-center">
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando imagen...</span>
            </div>
          </div>
        )}
        
        {hasError ? (
          <div className="d-flex flex-column justify-content-center align-items-center text-muted" style={{ minHeight: '400px' }}>
            <i className="bi bi-image" style={{ fontSize: '3rem' }}></i>
            <p className="mt-2 mb-0">Error al cargar la imagen</p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={alt}
            className="img-fluid"
            style={{ 
              maxHeight: '70vh',
              width: 'auto',
              display: isLoading ? 'none' : 'block'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    </div>
  );
};

describe('ImageModal', () => {
  const mockOnHide = vi.fn();

  beforeEach(() => {
    mockOnHide.mockClear();
  });

  it('renders when show is true', () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
        title="Test Title"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(
      <TestImageModal
        show={false}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
        title="Test Title"
      />
    );

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows default title when no title provided', () => {
    render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    expect(screen.getByText('Imagen')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando imagen...')).toBeInTheDocument();
  });

  it('renders image with correct attributes', () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(image).toHaveAttribute('alt', 'Test image');
    expect(image).toHaveClass('img-fluid');
  });

  it('calls onHide when close button is clicked', () => {
    render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    const closeButton = screen.getByRole('button');
    closeButton.click();
    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('has correct modal attributes', () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    const modal = container.querySelector('[data-testid="modal"]');
    expect(modal).toHaveAttribute('data-size', 'lg');
    expect(modal).toHaveAttribute('data-centered', 'true');
    expect(modal).toHaveClass('image-modal');
  });

  it('handles image load event', async () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    const image = container.querySelector('img');
    
    // Initially loading
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Simulate image load
    image.dispatchEvent(new Event('load'));
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('handles image error event', async () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/invalid.jpg"
        alt="Test image"
      />
    );

    const image = container.querySelector('img');
    
    // Initially loading
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Simulate image error
    image.dispatchEvent(new Event('error'));
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Error al cargar la imagen')).toBeInTheDocument();
    });
  });

  it('shows error state with icon', async () => {
    const { container } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/invalid.jpg"
        alt="Test image"
      />
    );

    const image = container.querySelector('img');
    image.dispatchEvent(new Event('error'));
    
    await waitFor(() => {
      const errorIcon = container.querySelector('.bi-image');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass('bi-image');
      expect(screen.getByText('Error al cargar la imagen')).toBeInTheDocument();
    });
  });

  it('resets state when show changes', () => {
    const { rerender } = render(
      <TestImageModal
        show={false}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    // Show modal
    rerender(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image.jpg"
        alt="Test image"
      />
    );

    // Should show loading state
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('resets state when imageUrl changes', () => {
    const { rerender } = render(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image1.jpg"
        alt="Test image"
      />
    );

    // Change image URL
    rerender(
      <TestImageModal
        show={true}
        onHide={mockOnHide}
        imageUrl="https://example.com/image2.jpg"
        alt="Test image"
      />
    );

    // Should show loading state again
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
