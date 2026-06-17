'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslations } from 'next-intl';

interface DashboardChartProps {
  loading?: boolean;
  error?: string | null;
  data?: any[];
  children?: React.ReactNode;
}

/**
 * HOC para manejar estados comunes en gráficos del dashboard
 */
export const withDashboardChart = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  emptyMessage: string,
  emptyIcon: string
) => {
  return function DashboardChartWrapper(props: P & DashboardChartProps) {
    const t = useTranslations('dashboard');
    
    if (props.loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">{t('loadingData')}</p>
          </div>
        </div>
      );
    }

    if (props.error) {
      return (
        <div className="d-flex justify-content-center align-items-center text-danger" style={{ height: 250 }}>
          <div className="text-center">
            <i className="bi bi-exclamation-triangle fs-1"></i>
            <p className="mt-2">{props.error}</p>
          </div>
        </div>
      );
    }

    if (!props.data || props.data.length === 0) {
      return (
        <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250 }}>
          <div className="text-center">
            <i className={`bi ${emptyIcon} fs-1`}></i>
            <p className="mt-2">{emptyMessage}</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
