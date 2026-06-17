'use client';

import React from 'react';
import { useLocale } from 'next-intl';

interface DateCellProps {
  value: string | Date | null | undefined;
  format?: 'date' | 'datetime';
  className?: string;
}

export default function DateCell({ value, format = 'date', className = '' }: DateCellProps) {
  const locale = useLocale();
  const localeString = locale === 'en' ? 'en-US' : 'es-ES';
  
  if (!value) return <span className="text-muted">-</span>;
  
  const date = new Date(value);
  
  if (format === 'datetime') {
    return (
      <span className={`text-muted ${className}`}>
        {date.toLocaleDateString(localeString, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    );
  }
  
  return (
    <span className={`text-muted ${className}`}>
      {date.toLocaleDateString(localeString, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}
    </span>
  );
}
