'use client';

import React from 'react';

interface StatusCardProps {
  variant: 'success' | 'info' | 'warning';
  title: string;
  description: React.ReactNode;
  link?: {
    href: string;
    label: string;
  };
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

const variantStyles = {
  success: {
    card: {
      background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
      border: '2px solid #059669',
    },
    icon: {
      background: 'rgba(255, 255, 255, 0.8)',
      color: '#059669',
    },
    title: { color: '#065f46' },
    text: { color: '#047857' },
  },
  warning: {
    card: {
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      border: '2px solid #f59e0b',
    },
    icon: {
      background: 'rgba(255, 255, 255, 0.8)',
      color: '#d97706',
    },
    title: { color: '#92400e' },
    text: { color: '#78350f' },
  },
  info: {
    card: {
      background: 'transparent',
      border: 'none',
    },
    icon: {
      background: '#f1f5f9',
      color: '#64748b',
    },
    title: { color: '#1e293b' },
    text: { color: '#64748b' },
  },
};

export function StatusCard({ variant, title, description, link, children, footer }: StatusCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        ...styles.card,
      }}
    >
      {variant === 'success' && (
        <div
          style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            ...styles.icon,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.5rem', height: '1.5rem' }}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      )}

      <h5
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: '0 0 0.5rem',
          ...styles.title,
        }}
      >
        {title}
      </h5>

      <div
        style={{
          fontSize: '0.875rem',
          lineHeight: '1.6',
          margin: '0 0 1rem',
          ...styles.text,
        }}
      >
        {description}
      </div>

      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#1e293b',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          {link.label}
        </a>
      )}

      {children}

      {footer}
    </div>
  );
}
