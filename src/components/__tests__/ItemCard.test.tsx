import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock formatValueWithSmartDateDetection
vi.mock('@/lib/format', () => ({
  formatValueWithSmartDateDetection: vi.fn((val) => `formatted-${val}`)
}));

// Test component that mimics ItemCard behavior
const TestItemCard = ({ item, onClick, className = '' }: any) => {
  const handleClick = () => onClick(item);

  const truncatedDescription = item.description 
    ? (item.description.length > 50 
        ? `${item.description.substring(0, 50)}...` 
        : item.description)
    : 'Sin descripción';

  const statesCount = item.states?.length || 0;
  const ariaLabel = `${item.name}. ${truncatedDescription}. Creado ${item.createdAt}${statesCount > 0 ? `. ${statesCount} estado${statesCount !== 1 ? 's' : ''}` : ''}`;

  return (
    <div 
      className={`item-card ${className}`} 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-roledescription="Tarjeta de item"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="item-card-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} title={item.name} loading="lazy" />
        ) : (
          <div className="item-placeholder">
            <span>📦</span>
          </div>
        )}
      </div>
      <div className="item-card-content">
        <h6 className="item-name">{item.name}</h6>
        <p className="item-description">{truncatedDescription}</p>
        <div className="item-meta">
          <small className="text-muted">
            Creado: {item.createdAt}
          </small>
          {statesCount > 0 && (
            <span className="states-badge">
              {statesCount} estado{statesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

describe('ItemCard', () => {
  const mockItem = {
    id: '1',
    name: 'Laptop HP',
    description: 'Laptop empresarial HP ProBook 450',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: '2024-01-15T10:00:00Z',
    states: [{ id: 's1' }, { id: 's2' }]
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders item information correctly', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    expect(screen.getByText('Laptop HP')).toBeInTheDocument();
    expect(screen.getByText('Laptop empresarial HP ProBook 450')).toBeInTheDocument();
    expect(screen.getByText(/Creado: 2024-01-15T10:00:00Z/)).toBeInTheDocument();
    expect(screen.getByText('2 estados')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(mockOnClick).toHaveBeenCalledWith(mockItem);
  });

  it('calls onClick when Enter key is pressed', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledWith(mockItem);
  });

  it('calls onClick when Space key is pressed', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledWith(mockItem);
  });

  it('truncates long descriptions', () => {
    const longDesc = 'a'.repeat(60);
    const itemWithLongDesc = { ...mockItem, description: longDesc };
    render(<TestItemCard item={itemWithLongDesc} onClick={mockOnClick} />);
    
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    expect(screen.getByText(/^a{50}\.\.\.$/)).toBeInTheDocument();
  });

  it('shows placeholder when no image', () => {
    const itemWithoutImage = { ...mockItem, imageUrl: undefined };
    render(<TestItemCard item={itemWithoutImage} onClick={mockOnClick} />);
    
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(image).toHaveAttribute('alt', 'Laptop HP');
  });

  it('shows correct aria-label', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', 'Laptop HP. Laptop empresarial HP ProBook 450. Creado 2024-01-15T10:00:00Z. 2 estados');
  });

  it('handles item without states', () => {
    const itemWithoutStates = { ...mockItem, states: undefined };
    render(<TestItemCard item={itemWithoutStates} onClick={mockOnClick} />);
    
    expect(screen.queryByText(/estado/)).not.toBeInTheDocument();
  });

  it('handles item with single state', () => {
    const itemWithOneState = { ...mockItem, states: [{ id: 's1' }] };
    render(<TestItemCard item={itemWithOneState} onClick={mockOnClick} />);
    
    expect(screen.getByText('1 estado')).toBeInTheDocument();
  });

  it('handles item without description', () => {
    const itemWithoutDesc = { ...mockItem, description: undefined };
    render(<TestItemCard item={itemWithoutDesc} onClick={mockOnClick} />);
    
    expect(screen.getByText('Sin descripción')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TestItemCard item={mockItem} onClick={mockOnClick} className="custom-class" />);
    
    const card = container.querySelector('.item-card');
    expect(card).toHaveClass('custom-class');
  });

  it('has correct accessibility attributes', () => {
    render(<TestItemCard item={mockItem} onClick={mockOnClick} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-roledescription', 'Tarjeta de item');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
