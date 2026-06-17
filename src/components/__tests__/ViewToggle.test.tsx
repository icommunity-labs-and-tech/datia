import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock react-bootstrap components specifically for this test
vi.mock('react-bootstrap', () => ({
  ButtonGroup: ({ children, size, className }: any) => 
    React.createElement('div', { 
      'data-testid': 'button-group', 
      'data-size': size, 
      className 
    }, children),
  Button: ({ children, onClick, disabled, variant, size, className, 'aria-label': ariaLabel, title }: any) => 
    React.createElement('button', { 
      onClick, 
      disabled, 
      'data-variant': variant,
      'data-size': size,
      className: `btn ${variant === 'primary' ? 'btn-primary' : 'btn-outline-secondary'}`,
      'data-testid': 'button',
      'aria-label': ariaLabel,
      title
    }, children),
}));

import { ViewToggle } from '../ViewToggle';

describe('ViewToggle', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    mockOnViewChange.mockClear();
  });

  it('should render both buttons', () => {
    render(<ViewToggle currentView="grid" onViewChange={mockOnViewChange} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('should show grid button as active when currentView is grid', () => {
    render(<ViewToggle currentView="grid" onViewChange={mockOnViewChange} />);
    
    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    const tableButton = buttons[1];
    
    expect(gridButton).toHaveClass('btn-primary');
    expect(tableButton).toHaveClass('btn-outline-secondary');
  });

  it('should show table button as active when currentView is table', () => {
    render(<ViewToggle currentView="table" onViewChange={mockOnViewChange} />);
    
    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    const tableButton = buttons[1];
    
    expect(gridButton).toHaveClass('btn-outline-secondary');
    expect(tableButton).toHaveClass('btn-primary');
  });

  it('should call onViewChange with grid when grid button is clicked', () => {
    render(<ViewToggle currentView="table" onViewChange={mockOnViewChange} />);
    
    const buttons = screen.getAllByRole('button');
    const gridButton = buttons[0];
    
    fireEvent.click(gridButton);
    expect(mockOnViewChange).toHaveBeenCalledWith('grid');
  });

  it('should call onViewChange with table when table button is clicked', () => {
    render(<ViewToggle currentView="grid" onViewChange={mockOnViewChange} />);
    
    const buttons = screen.getAllByRole('button');
    const tableButton = buttons[1];
    
    fireEvent.click(tableButton);
    expect(mockOnViewChange).toHaveBeenCalledWith('table');
  });

  it('should render icons in buttons', () => {
    render(<ViewToggle currentView="grid" onViewChange={mockOnViewChange} />);
    
    // Check that icons are present in the DOM by looking for the icon classes
    const buttons = screen.getAllByRole('button');
    const gridIcon = buttons[0].querySelector('.bi-grid-3x3-gap');
    const tableIcon = buttons[1].querySelector('.bi-table');
    
    expect(gridIcon).toBeInTheDocument();
    expect(tableIcon).toBeInTheDocument();
  });
});
