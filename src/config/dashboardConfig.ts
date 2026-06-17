import type { DashboardKPIs } from '@/types/dashboard';

export const KPI_CONFIG = {
  totalItems: {
    title: 'Total Productos',
    subtitle: 'Productos registrados',
    color: 'primary' as const,
    icon: 'bi-box',
    getValue: (kpis: DashboardKPIs) => kpis.totalPassports
  },
  backupRate: {
    title: 'Estados certificados',
    subtitle: (kpis: DashboardKPIs) => `${kpis.backedPassports} de ${kpis.backedPassports + kpis.pendingPassports}`,
    color: 'success' as const,
    icon: 'bi-shield-check',
    getValue: (kpis: DashboardKPIs) => `${kpis.backupRate}%`
  },
  operators: {
    title: 'Operadores',
    subtitle: 'Operadores activos',
    color: 'warning' as const,
    icon: 'bi-person-gear',
    getValue: (kpis: DashboardKPIs) => kpis.activeOperators
  },
  statesThisMonth: {
    title: 'Estados este mes',
    subtitle: 'Mes en curso',
    color: 'info' as const,
    icon: 'bi-calendar-check',
    getValue: (kpis: DashboardKPIs) => kpis.statesThisMonth
  }
} as const;

export const CHART_CONFIG = {
  monthlyActivity: {
    title: 'Actividad Mensual',
    subtitle: 'Usuarios vs Productos',
    emptyMessage: 'No hay datos de actividad disponibles',
    emptyIcon: 'bi-graph-up'
  },
  categoryDistribution: {
    title: 'Distribución por Categorías',
    subtitle: 'Productos por categoría',
    emptyMessage: 'No hay datos de categorías disponibles',
    emptyIcon: 'bi-pie-chart'
  },
  backupStatus: {
    title: 'Estado de Respaldos',
    subtitle: 'Estados creados este mes',
    emptyMessage: 'No hay datos de respaldo disponibles',
    emptyIcon: 'bi-shield-check'
  }
} as const;

export const DASHBOARD_THEME = {
  colors: {
    primary: '#0d6efd',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#60a5fa',
    danger: '#ef4444',
    blue: '#0d6efd',
    green: '#22c55e',
    amber: '#f59e0b',
    amberLight: '#fbbf24',
    grayTick: '#6b7280',
    grid: '#e5e7eb'
  },
  spacing: {
    chartHeight: 300,
    kpiHeight: 200
  }
} as const;
