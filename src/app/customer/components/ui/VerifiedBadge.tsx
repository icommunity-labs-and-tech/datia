'use client';

interface VerifiedBadgeProps {
  title?: string;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ title = 'Verificado en blockchain', size = 'md' }: VerifiedBadgeProps) {
  const dimensions = size === 'sm' ? '1rem' : '1.25rem';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{
        width: dimensions,
        height: dimensions,
        color: '#22c55e',
        flexShrink: 0,
      }}
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
