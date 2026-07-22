'use client';

type GlassVariant = 'box' | 'header' | 'kpi';

export default function GlassCard({
  children,
  className = '',
  variant = 'box',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
}) {
  const base = variant === 'header' ? 'glass-stretched' : 'glass-card';
  return (
    <div className={`${base} ${className}`} style={{ borderRadius: 8 }}>
      <div style={{ padding: '0.75rem 1.5rem' }}>
        {children}
      </div>
    </div>
  );
}
