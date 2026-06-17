'use client';

import { formatValueWithSmartDateDetection, truncateText } from '@/lib/format';
import React from 'react';

type Props = {
  data: Record<string, any>;
  title?: string;
};

export default function ObjectViewer({ data }: Props) {
  return (
    <div>
      {Object.entries(data).map(([key, value]) => {
        const formatted = formatValueWithSmartDateDetection(value, key);
        
        // Check if this is a date field to avoid truncating dates
        const isDateField = key.toLowerCase().includes('date') || 
                           key.toLowerCase().includes('created') || 
                           key.toLowerCase().includes('updated') ||
                           (typeof value === 'string' && value.includes('GMT'));
        
        const displayValue = isDateField ? formatted : truncateText(formatted, 12);
        
        return (
          <p key={key}>
            <strong>{key}:</strong> {displayValue}
          </p>
        );
      })}
    </div>
  );
}
