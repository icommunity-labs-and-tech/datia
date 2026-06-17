import { useState, useEffect, useCallback } from 'react';
import type { DashboardKPIs, MonthlyActivity, CategoryDistribution, BackupStatus, BackupStatusByUser } from '@/types/dashboard';

async function fetchJSON<T>(url: string, errorMessage: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
}

/**
 * Hook para cargar datos del dashboard con manejo de estado desde API routes
 */
export const useDashboardData = <T>(
  serviceMethod: () => Promise<T>,
  errorMessage: string
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await serviceMethod();
        setData(result);
      } catch (err) {
        setError(errorMessage);
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [serviceMethod, errorMessage]);

  return { data, loading, error };
};

/**
 * Hook específico para KPIs del dashboard
 */
export const useDashboardKPIs = () => {
  const fetchKPIs = useCallback(
    () => fetchJSON<DashboardKPIs>('/api/dashboard/kpis', 'Error al cargar los KPIs'),
    []
  );

  return useDashboardData<DashboardKPIs>(
    fetchKPIs,
    'Error al cargar los KPIs'
  );
};

/**
 * Hook específico para actividad mensual
 */
export const useMonthlyActivity = (months: number = 12) => {
  const fetchActivity = useCallback(
    () => fetchJSON<MonthlyActivity[]>(`/api/dashboard/activity?months=${months}`, 'Error al cargar datos de actividad'),
    [months]
  );

  return useDashboardData<MonthlyActivity[]>(
    fetchActivity,
    'Error al cargar datos de actividad'
  );
};

/**
 * Hook específico para distribución de categorías
 */
export const useCategoryDistribution = () => {
  const fetchCategories = useCallback(
    () => fetchJSON<CategoryDistribution[]>('/api/dashboard/categories', 'Error al cargar distribución por categorías'),
    []
  );

  return useDashboardData<CategoryDistribution[]>(
    fetchCategories,
    'Error al cargar distribución por categorías'
  );
};

/**
 * Hook específico para estado de respaldos
 */
export const useBackupStatus = () => {
  const fetchBackupStatus = useCallback(
    () => fetchJSON<BackupStatus[]>('/api/dashboard/backup-status', 'Error al cargar estado de respaldos'),
    []
  );

  return useDashboardData<BackupStatus[]>(
    fetchBackupStatus,
    'Error al cargar estado de respaldos'
  );
};

/**
 * Hook específico para estado de respaldos por usuario
 */
export const useBackupStatusByUser = (months: number = 1) => {
  const fetchBackupStatusByUser = useCallback(
    () => fetchJSON<BackupStatusByUser[]>(`/api/dashboard/backup-status-by-user?months=${months}`, 'Error al cargar el estado de respaldo por usuario'),
    [months]
  );
  return useDashboardData<BackupStatusByUser[]>(fetchBackupStatusByUser, 'Error al cargar el estado de respaldo por usuario');
};
