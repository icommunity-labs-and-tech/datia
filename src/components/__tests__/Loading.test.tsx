import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import LoadingOverlay from '../Loading';

// LoadingOverlay renders a Mantine <Loader>, which reads theme from context, so
// every render needs the provider. Before the Mantine migration this was a plain
// Bootstrap spinner and no wrapper was required.
const renderOverlay = () => render(<LoadingOverlay />, { wrapper: MantineProvider });

describe('LoadingOverlay', () => {
  it('should render spinner with correct role', () => {
    renderOverlay();

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply correct overlay styles', () => {
    renderOverlay();
    // Reached via the spinner rather than container.firstChild: MantineProvider
    // injects its own nodes, so the overlay is no longer the first child.
    const overlay = screen.getByRole('status').parentElement as HTMLElement;

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
    renderOverlay();
    // Reached via the spinner rather than container.firstChild: MantineProvider
    // injects its own nodes, so the overlay is no longer the first child.
    const overlay = screen.getByRole('status').parentElement as HTMLElement;

    expect(overlay).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
  });
});
