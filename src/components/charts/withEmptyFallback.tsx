import React from 'react';
import EmptyPlaceholder from '@/components/EmptyTable';

export type FallbackCheck<T> = (data: T) => boolean;

// HOC: wraps a chart component and renders EmptyPlaceholder when no data
export function withEmptyFallback<P extends { data: any }>(
  ChartComponent: React.ComponentType<P>,
  isEmpty: FallbackCheck<P['data']>,
  message = 'No hay datos para mostrar en el gráfico.'
) {
  return function WrappedChart(props: P) {
    try {
      const empty = isEmpty(props.data);
      if (empty) return <EmptyPlaceholder message={message} />;
      return <ChartComponent {...props} />;
    } catch {
      return <EmptyPlaceholder message={message} />;
    }
  };
}


