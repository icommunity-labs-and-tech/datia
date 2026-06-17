import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardKPIs from '../DashboardKPIs';

// Mock data for KPIs
const mockKPIs = {
  totalItems: 150,
  totalUsers: 25,
  totalCategories: 8,
  totalStates: 12
};

describe('DashboardKPIs', () => {
  it('should render 4 KPI cards', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(4);
  });

  it('should render correct KPI titles', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('Total Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Total Categorías')).toBeInTheDocument();
    expect(screen.getByText('Total Estados')).toBeInTheDocument();
  });

  it('should render correct KPI values', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render correct icons for each KPI', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    // Check that icons are rendered (they should be in the DOM as i elements)
    const icons = screen.getAllByRole('generic').filter(el => 
      el.tagName === 'I' && el.className.includes('bi')
    );
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render Row component', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    const row = screen.getByTestId('row');
    expect(row).toBeInTheDocument();
  });

  it('should render Col components for each KPI', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    
    const cols = screen.getAllByTestId('col');
    expect(cols).toHaveLength(4);
    
    // Each col should have md=3 attribute
    cols.forEach(col => {
      expect(col).toHaveAttribute('data-md', '3');
    });
  });

  it('should handle zero values correctly', () => {
    const zeroKPIs = {
      totalItems: 0,
      totalUsers: 0,
      totalCategories: 0,
      totalStates: 0
    };

    render(<DashboardKPIs kpis={zeroKPIs} />);
    
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('should handle undefined values gracefully', () => {
    const partialKPIs = {
      totalItems: 100,
      totalUsers: undefined as any,
      totalCategories: 5,
      totalStates: undefined as any
    };

    render(<DashboardKPIs kpis={partialKPIs} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
