'use client';

// formatValueWithSmartDateDetection removed - not currently used
import React from 'react';

type Props = {
  data: Record<string, any>;
  title?: string;
};

export default function ObjectViewerOptimized({ data }: Props) {
  // Solo mostrar campos esenciales del item
  const essentialFields = [
    'name',
    'description', 
    'status',
    'categoryId',
    'createdAt'
  ];

  // Campos que queremos mostrar con nombres más amigables
  const fieldLabels: Record<string, string> = {
    name: 'Nombre',
    description: 'Descripción',
    status: 'Estado',
    categoryId: 'Categoría',
    createdAt: 'Fecha de Creación'
  };

  // Función para formatear valores específicos
  const formatFieldValue = (key: string, value: any) => {
    if (key === 'status') {
      const status = value || 'N/A';
      const badgeClass = status === 'active' ? 'bg-success' :
                        status === 'pending' ? 'bg-warning' :
                        status === 'completed' ? 'bg-info' : 'bg-secondary';
      return (
        <span className={`badge ${badgeClass}`}>
          {status}
        </span>
      );
    }

    if (key === 'categoryId') {
      // Aquí podrías buscar el nombre de la categoría si lo necesitas
      return (
        <span className="text-info">
          {value ? `Categoría #${value.substring(0, 8)}...` : 'Sin categoría'}
        </span>
      );
    }

    if (key === 'createdAt') {
      if (!value) return '-';
      const date = new Date(value);
      return (
        <span className="text-muted">
          {date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      );
    }

    // Para texto normal, truncar si es muy largo
    if (typeof value === 'string' && value.length > 60) {
      return (
        <span title={value}>
          {value.substring(0, 60)}...
        </span>
      );
    }

    return value || '-';
  };

  return (
    <div className="item-details">
      {essentialFields.map(key => {
        if (!(key in data)) return null;
        
        const value = data[key];
        const label = fieldLabels[key] || key;
        const formattedValue = formatFieldValue(key, value);
        
        return (
          <div key={key} className="mb-3">
            <strong className="text-muted d-block mb-1">{label}:</strong>
            <div className="ps-2">
              {formattedValue}
            </div>
          </div>
        );
      })}
    </div>
  );
}
