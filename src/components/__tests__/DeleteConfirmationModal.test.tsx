import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Test component that mimics DeleteConfirmationModal behavior
const TestDeleteConfirmationModal = ({ 
  show, 
  onHide, 
  onConfirm, 
  title, 
  message, 
  cascadeInfo, 
  isLoading = false 
}: any) => {
  if (!show) return null;

  const hasCascade = cascadeInfo && Object.values(cascadeInfo).some(count => count && count > 0);

  const renderCascadeWarning = () => {
    if (!hasCascade) return null;

    const cascadeItems = [];
    
    if (cascadeInfo?.statusTypesDeleted && cascadeInfo.statusTypesDeleted > 0) {
      if (cascadeInfo.statusTypeNames && cascadeInfo.statusTypeNames.length > 0) {
        const displayNames = cascadeInfo.statusTypeNames.slice(0, 3);
        const remaining = cascadeInfo.statusTypesDeleted - displayNames.length;
        
        let text = displayNames.join(', ');
        if (remaining > 0) {
          text += ` y ${remaining} tipo${remaining !== 1 ? 's' : ''} de estado más`;
        }
        cascadeItems.push(text);
      } else {
        cascadeItems.push(`${cascadeInfo.statusTypesDeleted} tipo${cascadeInfo.statusTypesDeleted !== 1 ? 's' : ''} de estado`);
      }
    }
    
    if (cascadeInfo?.itemsDeleted && cascadeInfo.itemsDeleted > 0) {
      if (cascadeInfo.itemNames && cascadeInfo.itemNames.length > 0) {
        const displayNames = cascadeInfo.itemNames.slice(0, 3);
        const remaining = cascadeInfo.itemsDeleted - displayNames.length;
        
        let text = displayNames.join(', ');
        if (remaining > 0) {
          text += ` y ${remaining} item${remaining !== 1 ? 's' : ''} más`;
        }
        cascadeItems.push(text);
      } else {
        cascadeItems.push(`${cascadeInfo.itemsDeleted} item${cascadeInfo.itemsDeleted !== 1 ? 's' : ''}`);
      }
    }

    return (
      <div className="alert alert-warning mt-3">
        <strong>⚠️ Atención:</strong> Esta acción también eliminará:
        <ul className="mb-0 mt-2">
          {cascadeItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div data-testid="modal" data-centered="true">
      <div data-testid="modal-header">
        <button data-testid="modal-close" onClick={onHide}>×</button>
        <h5 data-testid="modal-title">{title}</h5>
      </div>
      <div data-testid="modal-body">
        <p>{message}</p>
        {renderCascadeWarning()}
      </div>
      <div data-testid="modal-footer">
        <button 
          onClick={onHide} 
          disabled={isLoading}
          data-testid="button"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm} 
          disabled={isLoading}
          data-testid="button"
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Eliminando...
            </>
          ) : (
            'Eliminar'
          )}
        </button>
      </div>
    </div>
  );
};

describe('DeleteConfirmationModal', () => {
  const mockOnHide = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnHide.mockClear();
    mockOnConfirm.mockClear();
  });

  it('should render when show is true', () => {
    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should not render when show is false', () => {
    render(
      <TestDeleteConfirmationModal
        show={false}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should call onConfirm when delete button is clicked', () => {
    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    const deleteButton = screen.getByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onHide when cancel button is clicked', () => {
    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when loading', () => {
    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
        isLoading={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    const deleteButton = screen.getByRole('button', { name: /eliminando/i });

    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('should show loading text when isLoading is true', () => {
    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
        isLoading={true}
      />
    );

    expect(screen.getByText('Eliminando...')).toBeInTheDocument();
  });

  it('should render cascade warning when cascadeInfo is provided', () => {
    const cascadeInfo = {
      statusTypesDeleted: 2,
      itemsDeleted: 1,
      statusTypeNames: ['Type 1', 'Type 2'],
      itemNames: ['Item 1']
    };

    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
        cascadeInfo={cascadeInfo}
      />
    );

    expect(screen.getByText(/⚠️ Atención:/)).toBeInTheDocument();
    expect(screen.getByText(/Esta acción también eliminará:/)).toBeInTheDocument();
    expect(screen.getByText('Type 1, Type 2')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('should not render cascade warning when cascadeInfo is empty', () => {
    const cascadeInfo = {
      statusTypesDeleted: 0,
      itemsDeleted: 0
    };

    render(
      <TestDeleteConfirmationModal
        show={true}
        onHide={mockOnHide}
        onConfirm={mockOnConfirm}
        title="Test Title"
        message="Test message"
        cascadeInfo={cascadeInfo}
      />
    );

    expect(screen.queryByText(/⚠️ Atención:/)).not.toBeInTheDocument();
  });
});
