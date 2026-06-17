'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatValueWithSmartDateDetection } from '@/lib/format';

export type ColumnFormat = 'text' | 'date' | 'datetime' | 'badge' | 'status' | 'number' | 'currency' | 'image' | 'custom' | 'relation' | 'action';

export interface UnifiedColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
  width?: string;
  sortable?: boolean;
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
  relationData?: any[];
  relationKey?: string;
  relationDisplay?: string;
  customRender?: (value: any, row: any) => React.ReactNode;
}

export type TableContext = 'list' | 'detail';

// Función para crear presets con traducciones
const createListColumnPresets = (t: (key: string) => string): Record<string, UnifiedColumn[]> => ({
  items: [
    { key: 'name', label: t('columnLabels.itemName'), format: 'text', width: '250px', sortable: true },
    { key: 'status', label: t('columnLabels.status'), format: 'status', width: '120px', sortable: true },
    { key: 'categoryId', label: t('columnLabels.category'), format: 'relation', width: '150px', sortable: true },
    { key: 'image', label: t('columnLabels.image'), format: 'image', width: '100px', sortable: false },
    { key: 'passport', label: t('columnLabels.passport'), format: 'action', width: '120px', sortable: false }
  ],
  categories: [
    { key: 'name', label: t('columnLabels.categoryName'), format: 'text', width: '250px', sortable: true },
    { key: 'itemCount', label: t('columnLabels.items'), format: 'number', width: '120px', sortable: true },
    { key: 'actions', label: t('columnLabels.actions'), format: 'action', width: '120px', sortable: false }
  ],
  states: [
    { key: 'status', label: t('columnLabels.status'), format: 'status', width: '120px', sortable: true },
    { key: 'itemId', label: t('columnLabels.item'), format: 'relation', width: '150px', sortable: true },
    { key: 'description', label: t('columnLabels.description'), format: 'text', width: '300px', sortable: true },
    { key: 'actions', label: t('columnLabels.actions'), format: 'action', width: '120px', sortable: false }
  ],
  users: [
    { key: 'name', label: t('columnLabels.name'), format: 'text', width: '200px', sortable: true },
    { key: 'role', label: t('columnLabels.role'), format: 'status', width: '120px', sortable: true },
    { key: 'createdAt', label: t('columnLabels.created'), format: 'datetime', width: '150px', sortable: true },
    { key: 'actions', label: t('columnLabels.actions'), format: 'action', width: '120px', sortable: false }
  ]
});

// Función para crear presets de detalle con traducciones
const createDetailColumnPresets = (t: (key: string) => string): Record<string, UnifiedColumn[]> => ({
  itemStates: [
    { key: 'status', label: t('columnLabels.status'), format: 'status', width: '120px' },
    { key: 'title', label: t('columnLabels.stateTitle'), format: 'text', width: '250px' },
    { key: 'description', label: t('columnLabels.description'), format: 'text', width: '300px' },
    { key: 'createdAt', label: t('columnLabels.creationDate'), format: 'datetime', width: '150px' },
    { key: 'actions', label: t('columnLabels.actions'), format: 'action', width: '100px' }
  ],
  categoryItems: [
    { key: 'name', label: t('columnLabels.itemName'), format: 'text', width: '200px' },
    { key: 'status', label: t('columnLabels.status'), format: 'status', width: '120px' },
    { key: 'createdAt', label: t('columnLabels.creationDate'), format: 'datetime', width: '150px' },
    { key: 'actions', label: t('columnLabels.actions'), format: 'action', width: '100px' }
  ]
});

// Formateadores unificados - ahora son funciones que reciben locale
const createFormatters = (locale: string) => {
  const localeString = locale === 'en' ? 'en-US' : 'es-ES';
  
  return {
    text: (value: any) => {
      if (!value) return '-';
      if (typeof value === 'string' && value.length > 50) {
        return (
          <span title={value}>
            {value.substring(0, 50)}...
          </span>
        );
      }
      return value;
    },
    date: (value: any) => {
      if (!value) return '-';
      const date = new Date(value);
      return (
        <span className="text-muted">
          {date.toLocaleDateString(localeString, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      );
    },
    datetime: (value: any) => {
      if (!value) return '-';
      const date = new Date(value);
      return (
        <span className="text-muted">
          {date.toLocaleDateString(localeString, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      );
    },
    badge: (value: any) => {
      if (!value) return '-';
      return (
        <span className="badge bg-secondary">
          {value}
        </span>
      );
    },
    status: (value: any) => {
      if (!value) return '-';
      const badgeClass = value === 'active' ? 'bg-success' :
                        value === 'pending' ? 'bg-warning' :
                        value === 'completed' ? 'bg-info' : 'bg-secondary';
      return (
        <span className={`badge ${badgeClass}`}>
          {value}
        </span>
      );
    },
    number: (value: any) => {
      if (value === null || value === undefined) return '-';
      return value.toLocaleString(localeString);
    },
    currency: (value: any) => {
      if (value === null || value === undefined) return '-';
      return new Intl.NumberFormat(localeString, {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    },
    image: (value: any) => {
      if (!value) return '-';
      return `[Imagen]`;
    },
    custom: (value: any) => value || '-',
    relation: (value: any, row: any, column?: UnifiedColumn) => {
      if (!column?.relationData || !column?.relationKey || !column?.relationDisplay) return value || '-';
      const relatedItem = column.relationData.find(item => item[column.relationKey!] === value);
      return relatedItem ? relatedItem[column.relationDisplay!] : value || '-';
    },
    action: (value: any) => value || '-'
  } as Record<ColumnFormat, (value: any, row: any, column?: UnifiedColumn) => React.ReactNode>;
};

export function useUnifiedColumns(
  data: any[],
  context: TableContext = 'list',
  preset?: string,
  customColumns?: UnifiedColumn[],
  relationData?: Record<string, any[]>
) {
  const locale = useLocale();
  const t = useTranslations('tables');
  const formatters = useMemo(() => createFormatters(locale), [locale]);
  const listPresets = useMemo(() => createListColumnPresets(t), [t]);
  const detailPresets = useMemo(() => createDetailColumnPresets(t), [t]);
  const allPresets = context === 'list' ? listPresets : detailPresets;
  
  const enhancedColumns = useMemo(() => {
    if (customColumns && customColumns.length > 0) {
      return customColumns;
    }

    if (preset && allPresets[preset]) {
      return allPresets[preset].map(col => ({
        ...col,
        relationData: relationData?.[col.key] || col.relationData
      }));
    }

    // Fallback: generar columnas automáticamente
    if (data.length > 0) {
      const sample = data[0];
      return Object.keys(sample)
        .filter(key => !['id', '__typename'].includes(key))
        .map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          format: 'text' as ColumnFormat,
          width: '150px'
        }));
    }

    return [];
  }, [data, context, preset, customColumns, relationData, allPresets]);

  const formatValue = (column: UnifiedColumn, value: any, row: any): React.ReactNode => {
    if (column.customRender) {
      return column.customRender(value, row);
    }
    
    const formatter = formatters[column.format || 'text'];
    return formatter(value, row, column);
  };

  return {
    columns: enhancedColumns,
    formatValue,
    presets: allPresets,
    context
  };
}

// Exportar funciones para crear presets (para compatibilidad)
export const getListColumnPresets = (t: (key: string) => string) => createListColumnPresets(t);
export const getDetailColumnPresets = (t: (key: string) => string) => createDetailColumnPresets(t);
