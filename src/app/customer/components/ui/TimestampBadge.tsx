'use client';

import { formatDateTime } from '../../utils/dateFormatters';

interface TimestampBadgeProps {
  timestamp: string;
  position?: 'inline' | 'absolute';
}

export function TimestampBadge({ timestamp, position = 'inline' }: TimestampBadgeProps) {
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.25rem 0.5rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '4px',
  };

  const positionStyles = position === 'absolute' ? {
    position: 'absolute' as const,
    top: '0.5rem',
    right: '0.5rem',
  } : {};

  return (
    <div style={{ ...baseStyles, ...positionStyles }}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        style={{ width: '12px', height: '12px', flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span style={{ fontSize: '0.7rem', fontWeight: '500', color: '#1e40af' }}>
        {formatDateTime(timestamp)}
      </span>
    </div>
  );
}
