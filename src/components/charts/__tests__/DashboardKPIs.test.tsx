import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardKPIs from '../DashboardKPIs';

const mockKPIs = {
  totalPassports: 150,
  backedPassports: 120,
  pendingPassports: 30,
  activePassports: 100,
  statesThisMonth: 5,
  evidencesGenerated: 200,
  backupRate: 80,
  activeUsers: 10,
  verifiedUsers: 8,
};

describe('DashboardKPIs', () => {
  it('should render KPI cards', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should render totalPassports value', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should render statesThisMonth value', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render backupRate as percentage', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should render icons for each KPI', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    const icons = screen.getAllByRole('generic').filter(el =>
      el.tagName === 'I' && el.className.includes('bi')
    );
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render Row component', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    expect(screen.getByTestId('row')).toBeInTheDocument();
  });

  it('should render Col components', () => {
    render(<DashboardKPIs kpis={mockKPIs} />);
    const cols = screen.getAllByTestId('col');
    expect(cols.length).toBeGreaterThan(0);
  });

  it('should handle zero values correctly', () => {
    const zeroKPIs = { totalPassports: 0, backedPassports: 0, pendingPassports: 0, activePassports: 0, statesThisMonth: 0, evidencesGenerated: 0, backupRate: 0, activeUsers: 0, verifiedUsers: 0 };
    render(<DashboardKPIs kpis={zeroKPIs} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});
