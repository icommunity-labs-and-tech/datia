import React from 'react';

interface TextTruncateCellProps {
  value: string | null | undefined;
  maxLength?: number;
  className?: string;
}

export default function TextTruncateCell({ value, maxLength = 50, className = '' }: TextTruncateCellProps) {
  if (!value) return <span className="text-muted">-</span>;
  
  if (value.length > maxLength) {
    return (
      <span title={value} className={className}>
        {value.substring(0, maxLength)}...
      </span>
    );
  }
  
  return <span className={className}>{value}</span>;
}
