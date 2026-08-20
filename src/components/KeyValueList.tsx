'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { StatusBadgeCell, DateCell, TextTruncateCell } from './GenericTable/Cells';
import { IconMapPin } from '@tabler/icons-react';

export interface FieldSchema {
  key: string;
  label: string;
  format?: 'text' | 'date' | 'datetime' | 'status' | 'number' | 'relation' | 'custom';
  maxLength?: number;
  relationData?: any[];
  relationKey?: string;
  relationDisplay?: string;
  customRender?: (value: any, data: any) => React.ReactNode;
  hidden?: boolean;
}

interface KeyValueListProps {
  data: Record<string, any>;
  schema: FieldSchema[];
  title?: string;
  className?: string;
  showEmptyFields?: boolean;
}

export default function KeyValueList({ 
  data, 
  schema, 
  title, 
  className = '', 
  showEmptyFields = false 
}: KeyValueListProps) {
  const locale = useLocale();
  const localeString = locale === 'en' ? 'en-US' : 'es-ES';
  const visibleFields = schema.filter(field => !field.hidden);
  
  const renderValue = (field: FieldSchema, value: any) => {
    if (field.customRender) {
      return field.customRender(value, data);
    }
    
    // Handle geolocation objects that might be passed as value
    if (value && typeof value === 'object' && 'lat' in value && 'lng' in value && field.format !== 'custom') {
      // If it's a geolocation object but format is not custom, render coordinates as text
      return (
        <span className="text-muted">
          <IconMapPin size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
          Lat: {value.lat.toFixed(6)}, Lng: {value.lng.toFixed(6)}
        </span>
      );
    }
    
    switch (field.format) {
      case 'status':
        return <StatusBadgeCell value={value} />;
        
      case 'date':
        return <DateCell value={value} format="date" />;
        
      case 'datetime':
        return <DateCell value={value} format="datetime" />;
        
      case 'number':
        if (value === null || value === undefined) return '-';
        return value.toLocaleString(localeString);
        
      case 'relation':
        if (!field.relationData || !field.relationKey || !field.relationDisplay) return value || '-';
        const relatedItem = field.relationData.find(item => item[field.relationKey!] === value);
        return relatedItem ? (
          <span className="text-info">{relatedItem[field.relationDisplay!]}</span>
        ) : (value || '-');
        
      case 'text':
      default:
        // Check if value is an object that shouldn't be rendered directly
        if (value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
          // Try to stringify if it's a plain object
          try {
            return <TextTruncateCell value={JSON.stringify(value)} maxLength={field.maxLength || 60} />;
          } catch {
            return <span className="text-muted fst-italic">Invalid value</span>;
          }
        }
        // Convert to string for TextTruncateCell (handles strings, numbers, etc.)
        const stringValue = value != null ? String(value) : null;
        return <TextTruncateCell value={stringValue} maxLength={field.maxLength || 60} />;
    }
  };
  
  return (
    <div className={`key-value-list ${className}`}>
      {title && <h5 className="mb-3">{title}</h5>}
      
      {visibleFields.map(field => {
        const value = data[field.key];
        
        // Ocultar campos vacíos si no se solicitan
        if (!showEmptyFields && (value === null || value === undefined || value === '')) {
          return null;
        }
        
        return (
          <div key={field.key} className="mb-3">
            <strong className="text-muted d-block mb-1">{field.label}:</strong>
            <div className="ps-2">
              {renderValue(field, value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
