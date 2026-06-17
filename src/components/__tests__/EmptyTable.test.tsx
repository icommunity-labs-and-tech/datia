import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyPlaceholder from '../EmptyTable';

describe('EmptyPlaceholder', () => {
  it('should render with default message', () => {
    render(<EmptyPlaceholder />);
    
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText(/No hay elementos para mostrar en esta tabla/)).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const customMessage = 'No se encontraron productos';
    render(<EmptyPlaceholder message={customMessage} />);
    
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should have correct structure and styling', () => {
    const { container } = render(<EmptyPlaceholder />);
    const wrapper = container.firstChild as HTMLElement;
    
    expect(wrapper).toHaveClass('text-center', 'text-muted', 'py-4');
  });

  it('should render strong element for title', () => {
    render(<EmptyPlaceholder />);
    
    const titleElement = screen.getByText('Sin resultados');
    expect(titleElement.tagName).toBe('STRONG');
  });

  it('should render message in a div with mt-1 class', () => {
    const customMessage = 'Custom message';
    render(<EmptyPlaceholder message={customMessage} />);
    
    const messageElement = screen.getByText(customMessage);
    expect(messageElement).toHaveClass('mt-1');
  });
});

