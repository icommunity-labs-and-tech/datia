import React from 'react';

interface StatusBadgeCellProps {
  value: string | null | undefined;
  className?: string;
}

export default function StatusBadgeCell({ value, className = '' }: StatusBadgeCellProps) {
  if (!value) return <span className="text-muted">-</span>;
  
  const badgeClass = value === 'active' ? 'bg-success' :
                    value === 'pending' ? 'bg-warning' :
                    value === 'completed' ? 'bg-info' : 'bg-secondary';
  
  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {value}
    </span>
  );
}
