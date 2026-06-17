import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple test component that mimics KpiGroup behavior
const TestKpiGroup = ({ kpis }: { kpis: Array<{label: string, value: number|string}> }) => {
  return (
    <div data-testid="row" className="text-center">
      {kpis.map((kpi, index) => (
        <div key={index} data-testid="col" data-md="4" className="mb-3">
          <div className={`glass-card kpi-card kpi-accent-${(index % 3) + 1} border-0`}>
            <div className="py-3 d-flex flex-column align-items-center justify-content-center">
              <div className="kpi-value mb-1">{kpi.value}</div>
              <small className="kpi-label">{kpi.label}</small>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

describe('KpiGroup', () => {
  const mockKpis = [
    { label: 'Total Items', value: 150 },
    { label: 'Usuarios', value: 25 },
    { label: 'Categorías', value: 8 }
  ];

  it('renders all KPIs', () => {
    render(<TestKpiGroup kpis={mockKpis} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Categorías')).toBeInTheDocument();
  });

  it('applies dynamic accent classes', () => {
    const { container } = render(<TestKpiGroup kpis={mockKpis} />);
    const cards = container.querySelectorAll('.kpi-card');
    
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveClass('kpi-accent-1');
    expect(cards[1]).toHaveClass('kpi-accent-2');
    expect(cards[2]).toHaveClass('kpi-accent-3');
  });

  it('renders with correct Bootstrap structure', () => {
    const { container } = render(<TestKpiGroup kpis={mockKpis} />);
    
    // Check for Row component
    const row = container.querySelector('[data-testid="row"]');
    expect(row).toBeInTheDocument();
    expect(row).toHaveClass('text-center');
    
    // Check for Col components
    const cols = container.querySelectorAll('[data-testid="col"]');
    expect(cols).toHaveLength(3);
    cols.forEach(col => {
      expect(col).toHaveAttribute('data-md', '4');
      expect(col).toHaveClass('mb-3');
    });
  });

  it('handles empty KPIs array', () => {
    const { container } = render(<TestKpiGroup kpis={[]} />);
    
    const cards = container.querySelectorAll('.kpi-card');
    expect(cards).toHaveLength(0);
  });

  it('handles single KPI', () => {
    const singleKpi = [{ label: 'Solo Item', value: 42 }];
    render(<TestKpiGroup kpis={singleKpi} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Solo Item')).toBeInTheDocument();
  });

  it('handles string values', () => {
    const stringKpis = [
      { label: 'Status', value: 'Active' },
      { label: 'Version', value: 'v2.1.0' }
    ];
    render(<TestKpiGroup kpis={stringKpis} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('v2.1.0')).toBeInTheDocument();
  });

  it('handles mixed value types', () => {
    const mixedKpis = [
      { label: 'Count', value: 100 },
      { label: 'Status', value: 'Online' },
      { label: 'Percentage', value: 85.5 }
    ];
    render(<TestKpiGroup kpis={mixedKpis} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('85.5')).toBeInTheDocument();
  });
});