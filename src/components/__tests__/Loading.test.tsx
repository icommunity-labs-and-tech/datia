import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '../Loading';

describe('LoadingOverlay', () => {
  it('should render spinner with correct role', () => {
    render(<LoadingOverlay />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('spinner-border');
  });

  it('should apply correct overlay styles', () => {
    const { container } = render(<LoadingOverlay />);
    const overlay = container.firstChild as HTMLElement;
    
    expect(overlay).toHaveStyle({
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '9999'
    });
  });

  it('should center the spinner in the overlay', () => {
    const { container } = render(<LoadingOverlay />);
    const overlay = container.firstChild as HTMLElement;
    
    expect(overlay).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
  });
});
