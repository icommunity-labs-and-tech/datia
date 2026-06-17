'use client';

import { Card } from 'react-bootstrap';

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
    <Card className={`${base} border-0 rounded ${className}`}>
      <Card.Body className={variant === 'header' ? 'px-4 py-3' : 'px-4 py-3'}>
        {children}
      </Card.Body>
    </Card>
  );
}


