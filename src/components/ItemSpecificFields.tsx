'use client';

import React from 'react';
import ImageDisplay from './ImageDisplay';
import KeyValueList, { FieldSchema } from './KeyValueList';
import GeolocationMap from './GeolocationMapClient';
import { useTranslations } from 'next-intl';

interface FieldDefinition {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'image' | 'geolocation';
  required?: boolean;
  options?: string[];
}

interface ItemSpecificFieldsProps {
  itemTemplate: FieldDefinition[];
  templateFields: Record<string, any>;
  className?: string;
}

export default function ItemSpecificFields({
  itemTemplate,
  templateFields,
  className = ''
}: ItemSpecificFieldsProps) {
  const t = useTranslations('common');
  const generateLabel = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!Array.isArray(itemTemplate) || itemTemplate.length === 0) {
    return null;
  }

  // Construir esquema para KeyValueList, alineado con los campos "comunes"
  const schema: FieldSchema[] = itemTemplate.map((field) => {
    const key = field.name;
    const label = generateLabel(field.name);

    if (field.type === 'image') {
      return {
        key,
        label,
        format: 'custom',
        customRender: (value: any) => {
          if (!value) return <span className="text-muted fst-italic">{t('unspecified')}</span>;
          return (
            <ImageDisplay
              imageUrl={value}
              alt={label}
              clickable={true}
              modalTitle={label}
              style={{ maxWidth: '150px', maxHeight: '150px', width: 'auto', height: 'auto', borderRadius: 8 }}
            />
          );
        }
      } as FieldSchema;
    }

    if (field.type === 'geolocation') {
      return {
        key,
        label,
        format: 'custom',
        customRender: (value: any) => {
          if (!value || typeof value !== 'object' || !('lat' in value) || !('lng' in value)) {
            return <span className="text-muted fst-italic">{t('unspecified')}</span>;
          }
          return (
            <GeolocationMap
              value={{ lat: value.lat, lng: value.lng }}
              readOnly={true}
            />
          );
        }
      } as FieldSchema;
    }

    // Mapear tipos a formatos de KeyValueList
    const typeToFormat: Record<string, FieldSchema['format']> = {
      text: 'text',
      select: 'text',
      email: 'email' as any, // se renderiza como texto truncado; podemos ajustar si hay KeyValueList para email
      number: 'number',
      date: 'date',
    };

    return {
      key,
      label,
      format: typeToFormat[field.type] || 'text',
    } as FieldSchema;
  });

  return (
    <div className={className}>
      <KeyValueList 
        data={templateFields} 
        schema={schema} 
        showEmptyFields={false}
      />
    </div>
  );
}
